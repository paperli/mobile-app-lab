import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import {
  SOCKET_EVENTS,
  type VoiceConfirmPromptPayload,
  type VoiceState,
  type VoiceTranscriptPayload,
} from '@mobile-app-lab/shared';
import { getSpeechRecognitionBridge, type RecognitionResult } from '../utils/speechRecognitionBridge';
import { speak, cancelSpeech } from '../utils/speechSynthesisBridge';

interface UseVoiceTransportOptions {
  socket: Socket | null;
  isPaired: boolean;
  roomCode: string;
}

const AFFIRMATIVES = /\b(yes|yeah|yep|yup|sure|ok|okay|confirm|do it|go ahead|please)\b/i;
const NEGATIVES = /\b(no|nope|nah|cancel|stop|don't|do not|never mind|nevermind)\b/i;

const CONFIRM_TIMEOUT_MS = 6000;

// SFSpeechRecognizer's `isFinal` only flips when Apple detects end-of-speech,
// which in continuous mode can take seconds or never fire. Promote a stable
// interim to "final" after this much silence so the TV matcher gets fed.
const INTERIM_PROMOTE_MS = 800;

// After we emit a transcript (either a real final or a promoted interim),
// SFSpeechRecognizer often follows with its own delayed isFinal carrying the
// same text. Drop duplicates within this window so each utterance fires once.
// Apple's late final can land 2+ seconds after the promoted interim, so the
// window needs to be generous.
const DEDUPE_WINDOW_MS = 3000;

function classifyYesNo(transcript: string): boolean | null {
  if (NEGATIVES.test(transcript)) return false;
  if (AFFIRMATIVES.test(transcript)) return true;
  return null;
}

/**
 * Lowercase, drop punctuation, collapse whitespace. Apple's final transcripts
 * often differ from interim by case + trailing period ("right" vs "Right.")
 * which would otherwise defeat the dedupe and the TV-side matcher.
 */
function normalizeTranscript(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Always-on voice transport: streams transcripts mobile→TV, runs the
 * confirmation roundtrip when TV asks a yes/no question, and reports voice
 * state. The matcher itself lives on the TV.
 */
export function useVoiceTransport({ socket, isPaired, roomCode }: UseVoiceTransportOptions) {
  // Keep latest socket/roomCode in refs so the long-lived bridge subscription
  // doesn't need to be torn down every time React re-renders.
  const socketRef = useRef(socket);
  const roomRef = useRef(roomCode);
  useEffect(() => { socketRef.current = socket; }, [socket]);
  useEffect(() => { roomRef.current = roomCode; }, [roomCode]);

  // While awaiting-confirm, transcripts are intercepted locally rather than
  // forwarded to the TV. This ref is the gate.
  const pendingPromptRef = useRef<{ promptId: string; timeoutId: number } | null>(null);
  const stateRef = useRef<VoiceState>('idle');

  // Dedupe state lives on a ref (not a closure-local) so that multiple
  // subscribers — StrictMode's double-mount, lingering HMR closures, etc. —
  // all share the same window. Without this, each closure starts with its
  // own null `lastEmitted` and emits independently for the same utterance.
  const lastEmittedRef = useRef<{ text: string; ts: number } | null>(null);

  const emitState = (next: VoiceState) => {
    if (stateRef.current === next) return;
    stateRef.current = next;
    const sock = socketRef.current;
    const room = roomRef.current;
    if (sock && room) {
      sock.emit(SOCKET_EVENTS.VOICE_STATE, { roomCode: room, state: next });
    }
  };

  useEffect(() => {
    if (!isPaired || !socket || !roomCode) return;

    const bridge = getSpeechRecognitionBridge();
    if (!bridge.isSupported) {
      console.warn('[useVoiceTransport] no speech recognition available');
      return;
    }
    console.log('[useVoiceTransport] using bridge:', bridge.kind);

    const finishConfirm = (confirmed: boolean | null) => {
      const pending = pendingPromptRef.current;
      if (!pending) return;
      window.clearTimeout(pending.timeoutId);
      pendingPromptRef.current = null;
      const sock = socketRef.current;
      const room = roomRef.current;
      if (sock && room) {
        sock.emit(SOCKET_EVENTS.VOICE_CONFIRM_RESPONSE, {
          roomCode: room,
          promptId: pending.promptId,
          confirmed,
        });
      }
      emitState('listening');
    };

    let interimPromoteTimer: number | null = null;
    let lastInterim: { text: string; confidence: number } | null = null;

    const cancelPromote = () => {
      if (interimPromoteTimer !== null) {
        window.clearTimeout(interimPromoteTimer);
        interimPromoteTimer = null;
      }
      lastInterim = null;
    };

    const emitTranscript = (text: string, recognizerConfidence: number) => {
      const sock = socketRef.current;
      const room = roomRef.current;
      if (!sock || !room) return;

      const normalized = normalizeTranscript(text);
      if (!normalized) return;

      const now = Date.now();
      const last = lastEmittedRef.current;
      if (
        last &&
        last.text === normalized &&
        now - last.ts < DEDUPE_WINDOW_MS
      ) {
        // Apple's delayed isFinal restating what we already sent, or a
        // duplicate subscriber from StrictMode/HMR firing in parallel.
        console.log('[useVoiceTransport] dedupe drop:', normalized);
        return;
      }
      lastEmittedRef.current = { text: normalized, ts: now };

      // While awaiting confirm, intercept yes/no locally rather than send.
      if (pendingPromptRef.current) {
        const verdict = classifyYesNo(normalized);
        if (verdict !== null) finishConfirm(verdict);
        return;
      }

      const payload: VoiceTranscriptPayload = {
        roomCode: room,
        transcript: normalized,
        recognizerConfidence,
        isFinal: true,
        timestamp: now,
      };
      console.log('[useVoiceTransport] → TV', payload.transcript);
      sock.emit(SOCKET_EVENTS.VOICE_TRANSCRIPT, payload);
    };

    const handleResult = (r: RecognitionResult) => {
      const text = r.transcript.trim();
      if (!text) return;

      if (r.isFinal) {
        cancelPromote();
        emitTranscript(text, r.confidence);
        return;
      }

      // Interim — debounce. If the text stops changing for INTERIM_PROMOTE_MS,
      // we treat it as final and emit. New interims reset the timer.
      lastInterim = { text, confidence: r.confidence };
      if (interimPromoteTimer !== null) window.clearTimeout(interimPromoteTimer);
      interimPromoteTimer = window.setTimeout(() => {
        const captured = lastInterim;
        interimPromoteTimer = null;
        lastInterim = null;
        if (captured) emitTranscript(captured.text, captured.confidence);
      }, INTERIM_PROMOTE_MS);
    };

    const unsubscribe = bridge.onResult(handleResult);

    const handleConfirmPrompt = async (payload: VoiceConfirmPromptPayload) => {
      // Clear any in-flight prompt — TV-driven flow is single-track for now.
      if (pendingPromptRef.current) {
        window.clearTimeout(pendingPromptRef.current.timeoutId);
        pendingPromptRef.current = null;
      }
      cancelSpeech();
      emitState('speaking');
      try {
        await speak(payload.prompt);
      } catch (err) {
        console.warn('[useVoiceTransport] TTS failed', err);
      }
      // Open the listening window after we've spoken so we don't hear our
      // own prompt.
      const timeoutId = window.setTimeout(() => finishConfirm(null), CONFIRM_TIMEOUT_MS);
      pendingPromptRef.current = { promptId: payload.promptId, timeoutId };
      emitState('awaiting-confirm');
    };

    socket.on(SOCKET_EVENTS.VOICE_CONFIRM_PROMPT, handleConfirmPrompt);

    bridge.start();
    emitState('listening');

    return () => {
      unsubscribe();
      bridge.stop();
      socket.off(SOCKET_EVENTS.VOICE_CONFIRM_PROMPT, handleConfirmPrompt);
      cancelPromote();
      if (pendingPromptRef.current) {
        window.clearTimeout(pendingPromptRef.current.timeoutId);
        pendingPromptRef.current = null;
      }
      cancelSpeech();
      emitState('idle');
    };
  // socketRef/roomRef bypass intentional re-subscribes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaired, socket, roomCode]);
}
