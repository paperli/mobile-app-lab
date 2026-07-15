import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Routes, Route, useSearchParams } from 'react-router-dom';
import {
  NavigationInputPayload,
  NavigationDirection,
  NavigationAction,
  PLACEHOLDER_GAMES,
  SOCKET_EVENTS,
  type VoiceTranscriptPayload,
  type VoiceConfirmResponsePayload,
  type VoiceStatePayload,
  type StudioPhase,
  type StudioGameKind,
  type StudioSubmitPayload,
  type StudioActionPayload,
  type StudioAnswerPayload,
  type StudioQuestion,
  type StudioPlayStatus,
  deriveStudioGame,
  STUDIO_QUESTIONS,
  STUDIO_ROUND_LENGTH,
  STUDIO_POINTS_PER_CORRECT,
  STUDIO_REVEAL_MS,
} from '@mobile-app-lab/shared';
import { matchVoice, type VoiceIntent } from './utils/voiceMatcher';
import { VoiceDebugOverlay, type TVVoiceDebugEvent } from './components/VoiceDebugOverlay';
import {
  SystemMenuOverlay,
  WEEKEND_PLAYERS,
  type Slot,
  type ExitAction,
  type ExitTabContent,
  type SystemMenuOverlayHandle,
  type SystemMenuTab,
} from '@weekend/ui';
import { GameHub, type HubHandle, type StudioCreatedGame } from './components/GameHub';
import { HUB_GAMES } from './prototype/hub/games';
import { LoadingScreen } from './components/song-quiz/LoadingScreen';
import { GameMenu } from './components/song-quiz/GameMenu';
import { PlaylistSelect } from './components/song-quiz/PlaylistSelect';
import { PartyPlaylistSelect, type PartyPlaylistHandle } from './components/song-quiz/PartyPlaylistSelect';
import { GRID, findClosestCol } from './components/song-quiz/PlaylistFocusFrame';
import { StudioView } from './components/studio/StudioView';
import { StudioPlay } from './components/studio/StudioPlay';
import { StudioExitConfirm } from './components/studio/StudioExitConfirm';
import { GameMasterGlobe } from './components/studio/GameMasterGlobe';
import { useSocket } from './hooks/useSocket';
import { useKeyboardNav } from './hooks/useKeyboardNav';
import { soundManager } from './utils/sounds';
import { PreviewShell } from './preview/PreviewShell';
import { getMobileUrl } from './utils/getMobileUrl';

type AppScreen = 'hub' | 'loading' | 'game-menu' | 'playlist-select' | 'party-playlist-select' | 'studio';

// Configuration
const LOADING_DURATION_MS = 5000; // Adjustable loading time
const MENU_ITEM_COUNT = 2; // Single Player + Party Mode
// Faked "build your game" duration (prototype). The TV progress bar and the
// TV→game transition both run off this, so they stay in lockstep.
const STUDIO_GEN_MS = 10000;
// After generating, the game-tile "breathing" reveal plays before the preview.
const STUDIO_REVEAL_MS_TILE = 2600;

// Pressing back on these screens opens the system menu (exit confirmation)
// instead of navigating up a step.
const BOUNDARY_SCREENS: ReadonlySet<AppScreen> = new Set(['hub', 'game-menu']);

// Live state for one playable Studio round (C1).
interface StudioPlayState {
  status: StudioPlayStatus;
  questionIndex: number;
  selectedIndex: number | null;
  score: number;
  questions: StudioQuestion[];
}

// Assemble a fresh round from the shared question bank.
function buildStudioRound(): StudioPlayState {
  const questions = STUDIO_QUESTIONS.slice(0, STUDIO_ROUND_LENGTH).map((q) => ({
    prompt: q.prompt,
    options: [...q.options],
    correctIndex: q.correctIndex,
  }));
  return { status: 'question', questionIndex: 0, selectedIndex: null, score: 0, questions };
}

// Reveal the answer for the current question and score it. Returns the next
// play state (no-op unless a question is currently awaiting an answer).
function revealStudioAnswer(prev: StudioPlayState | null, index: number): StudioPlayState | null {
  if (!prev || prev.status !== 'question') return prev;
  const q = prev.questions[prev.questionIndex];
  const correct = index === q.correctIndex;
  return {
    ...prev,
    status: 'reveal',
    selectedIndex: index,
    score: correct ? prev.score + STUDIO_POINTS_PER_CORRECT : prev.score,
  };
}

// 2x2 option grid movement for the phone d-pad (options laid out 0 1 / 2 3).
function moveStudioFocus(i: number, direction: NavigationDirection): number {
  const row = Math.floor(i / 2);
  const col = i % 2;
  if (direction === 'left' && col > 0) return i - 1;
  if (direction === 'right' && col < 1) return i + 1;
  if (direction === 'up' && row > 0) return i - 2;
  if (direction === 'down' && row < 1) return i + 2;
  return i;
}

// Build the TV → mobile gameplay payload from the local round state.
function studioGamePayload(roomCode: string, play: StudioPlayState) {
  const q = play.questions[play.questionIndex];
  const revealed = play.status !== 'question';
  return {
    roomCode,
    status: play.status,
    questionIndex: play.questionIndex,
    totalQuestions: play.questions.length,
    prompt: q?.prompt ?? '',
    options: q ? [...q.options] : [],
    correctIndex: revealed ? q?.correctIndex : undefined,
    selectedIndex: revealed ? play.selectedIndex : null,
    score: play.score,
  };
}

function MainTvApp() {
  // URL params (mockup switches):
  //   ?pairing=true    → show the QR pairing panel (hidden by default on the mockup)
  //   ?phase=N         → pick a hub prototype phase (1 = current; more later)
  //   ?variation=N     → pick a hub layout variation (1 = current; more later)
  const [searchParams] = useSearchParams();
  const showPairing = searchParams.get('pairing') === 'true';
  // Use the phase param verbatim when present (so ?phase=0 stays 0); default 1.
  const hubPhase = searchParams.has('phase') ? Number(searchParams.get('phase')) : 1;
  const hubVariation = Number(searchParams.get('variation')) || 1;
  const showDebug = searchParams.get('debug') === 'true';

  // Screen state
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('hub');
  // Which hub top-nav page to land on when we return to the hub. The Studio flow
  // is entered from the Studio tab, so exiting it returns there (not Home).
  const [hubInitialPage, setHubInitialPage] = useState<'home' | 'studio'>('home');

  // Game Studio state (only meaningful while currentScreen === 'studio').
  //   phase   — connect → prompt → generating → game (see StudioPhase)
  //   version — 0 until the first build completes, then 1, 2, … per iteration
  //   listening — the phone is holding its mic (drives the game-master overlay)
  const [studioPhase, setStudioPhase] = useState<StudioPhase>('connect');
  const [studioVersion, setStudioVersion] = useState(0);
  const [studioListening, setStudioListening] = useState(false);
  // The game the TV built from the user's idea (C2): drives the TV/phone titles.
  const [studioIdea, setStudioIdea] = useState('');
  const [studioTitle, setStudioTitle] = useState('');
  const [studioKind, setStudioKind] = useState<StudioGameKind>('trivia');
  // Live gameplay state for the playable round (C1); null when not playing.
  const [studioPlay, setStudioPlay] = useState<StudioPlayState | null>(null);
  // Which option the phone's d-pad is hovering during a question (0..3).
  const [studioPlayFocus, setStudioPlayFocus] = useState(0);
  // Games built this session — a temporary in-memory cache shown in the Studio
  // "My games" row. Cleared on TV reload (App remount).
  const [studioCreatedGames, setStudioCreatedGames] = useState<StudioCreatedGame[]>([]);
  const studioGameSeqRef = useRef(0);
  // True while the phone has the Develop tool open — un-fades the on-top globe.
  const [studioDeveloping, setStudioDeveloping] = useState(false);
  // "Leave game creation?" confirmation; phone becomes a d-pad to answer it.
  const [studioExitConfirm, setStudioExitConfirm] = useState(false);
  // Focused button in the exit confirm: 0 = Keep building, 1 = Leave.
  const [studioExitFocus, setStudioExitFocus] = useState(0);
  const studioPhaseRef = useRef(studioPhase);
  studioPhaseRef.current = studioPhase;
  const studioPlayFocusRef = useRef(studioPlayFocus);
  studioPlayFocusRef.current = studioPlayFocus;
  const studioExitConfirmRef = useRef(studioExitConfirm);
  studioExitConfirmRef.current = studioExitConfirm;
  const studioExitFocusRef = useRef(studioExitFocus);
  studioExitFocusRef.current = studioExitFocus;
  // Refs so the "re-sync on phone join" handler (B1) can read current values
  // without re-subscribing the socket listener on every change.
  const studioVersionRef = useRef(studioVersion);
  studioVersionRef.current = studioVersion;
  const studioIdeaRef = useRef(studioIdea);
  studioIdeaRef.current = studioIdea;
  const studioTitleRef = useRef(studioTitle);
  studioTitleRef.current = studioTitle;
  const studioKindRef = useRef(studioKind);
  studioKindRef.current = studioKind;
  const studioPlayRef = useRef(studioPlay);
  studioPlayRef.current = studioPlay;
  // Remembers whether the in-flight build is a first create or an iteration, so
  // the generating timer knows whether to set v1 or bump the version.
  const studioSubmitModeRef = useRef<'create' | 'iterate'>('create');

  // Enter the full-screen create flow from the hub's "Create new game" tile.
  const handleCreateGame = useCallback(() => {
    setStudioPhase('connect');
    setStudioVersion(0);
    setStudioListening(false);
    setStudioIdea('');
    setStudioTitle('');
    setStudioKind('trivia');
    setStudioPlay(null);
    setStudioPlayFocus(0);
    setStudioExitConfirm(false);
    setStudioExitFocus(0);
    setStudioDeveloping(false);
    setHubInitialPage('studio'); // exiting Studio returns to the Studio tab
    setCurrentScreen('studio');
  }, []);

  // System menu state
  const [systemMenuOpen, setSystemMenuOpen] = useState(false);
  const [systemMenuInitialTab, setSystemMenuInitialTab] = useState<SystemMenuTab>('resume');
  const systemMenuRef = useRef<SystemMenuOverlayHandle>(null);
  // Keep a stable ref of the open flag for keyboard/socket handlers that
  // close over an outdated closure.
  const systemMenuOpenRef = useRef(systemMenuOpen);
  useEffect(() => {
    systemMenuOpenRef.current = systemMenuOpen;
  }, [systemMenuOpen]);

  // Hub — self-contained nav system driven via ref (like PartyPlaylistSelect).
  const hubRef = useRef<HubHandle>(null);

  // Game menu state
  const [menuFocusedIndex, setMenuFocusedIndex] = useState(0);
  const [menuBounceDirection, setMenuBounceDirection] = useState<NavigationDirection | null>(null);
  const [menuIsPressing, setMenuIsPressing] = useState(false);

  // Playlist select state
  const [playlistFocusRow, setPlaylistFocusRow] = useState(0);
  const [playlistFocusCol, setPlaylistFocusCol] = useState(0);
  const [playlistBounceDirection, setPlaylistBounceDirection] = useState<NavigationDirection | null>(null);
  const [playlistIsPressing, setPlaylistIsPressing] = useState(false);

  // Party Mode playlist selection — self-contained nav system driven via ref.
  const partyPlaylistRef = useRef<PartyPlaylistHandle>(null);

  const audioUnlockedRef = useRef(false);
  const games = PLACEHOLDER_GAMES;

  // Loading → game-menu timer
  useEffect(() => {
    if (currentScreen === 'loading') {
      const timer = setTimeout(() => setCurrentScreen('game-menu'), LOADING_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [currentScreen]);

  const handleNavigate = useCallback((direction: NavigationDirection) => {
    // System menu swallows all directional input while open.
    if (systemMenuOpenRef.current) {
      systemMenuRef.current?.navigate(direction);
      return;
    }
    if (currentScreen === 'party-playlist-select') {
      partyPlaylistRef.current?.navigate(direction);
      return;
    }
    if (currentScreen === 'studio') {
      // Exit confirmation owns the d-pad while shown (Keep building ↔ Leave).
      if (studioExitConfirmRef.current) {
        if (direction === 'left' || direction === 'right') {
          setStudioExitFocus(direction === 'left' ? 0 : 1);
          soundManager.playNavigationSound();
        }
        return;
      }
      // Gameplay question: the phone d-pad moves the option cursor on the TV.
      if (studioPhaseRef.current === 'playing' && studioPlayRef.current?.status === 'question') {
        setStudioPlayFocus((i) => {
          const ni = moveStudioFocus(i, direction);
          if (ni !== i) soundManager.playNavigationSound();
          return ni;
        });
      }
      return;
    }
    if (currentScreen === 'hub') {
      // Hub owns its own 2D roving focus (hero + rows); plays its own sounds.
      hubRef.current?.navigate(direction);
    } else if (currentScreen === 'game-menu') {
      setMenuFocusedIndex((current) => {
        let newIndex = current;
        let shouldBounce = false;

        switch (direction) {
          case 'left':
            if (current === 0) shouldBounce = true;
            else newIndex = current - 1;
            break;
          case 'right':
            if (current === MENU_ITEM_COUNT - 1) shouldBounce = true;
            else newIndex = current + 1;
            break;
          case 'up':
          case 'down':
            shouldBounce = true;
            break;
        }

        if (shouldBounce) {
          setMenuBounceDirection(direction);
          setTimeout(() => setMenuBounceDirection(null), 200);
          soundManager.playBounceSound();
        } else if (newIndex !== current) {
          soundManager.playNavigationSound();
        }

        return newIndex;
      });
    } else if (currentScreen === 'playlist-select') {
      // Grid navigation for playlist selection
      // Sound effects are played inside updaters to match hub/game-menu pattern
      switch (direction) {
        case 'left':
          setPlaylistFocusCol((current) => {
            if (current === 0) {
              setPlaylistBounceDirection(direction);
              setTimeout(() => setPlaylistBounceDirection(null), 200);
              soundManager.playBounceSound();
              return current;
            }
            soundManager.playNavigationSound();
            return current - 1;
          });
          break;
        case 'right':
          setPlaylistFocusCol((current) => {
            const maxCol = (playlistFocusRow === 0 ? GRID.featured.count : GRID.recent.count) - 1;
            if (current === maxCol) {
              setPlaylistBounceDirection(direction);
              setTimeout(() => setPlaylistBounceDirection(null), 200);
              soundManager.playBounceSound();
              return current;
            }
            soundManager.playNavigationSound();
            return current + 1;
          });
          break;
        case 'up':
          if (playlistFocusRow === 0) {
            setPlaylistBounceDirection(direction);
            setTimeout(() => setPlaylistBounceDirection(null), 200);
            soundManager.playBounceSound();
          } else {
            const closestCol = findClosestCol(playlistFocusRow, playlistFocusCol, 0);
            setPlaylistFocusRow(0);
            setPlaylistFocusCol(closestCol);
            soundManager.playNavigationSound();
          }
          break;
        case 'down':
          if (playlistFocusRow === 1) {
            setPlaylistBounceDirection(direction);
            setTimeout(() => setPlaylistBounceDirection(null), 200);
            soundManager.playBounceSound();
          } else {
            const closestCol = findClosestCol(playlistFocusRow, playlistFocusCol, 1);
            setPlaylistFocusRow(1);
            setPlaylistFocusCol(closestCol);
            soundManager.playNavigationSound();
          }
          break;
      }
    }
  }, [currentScreen, playlistFocusRow, playlistFocusCol]);

  const handleAction = useCallback((action: NavigationAction) => {
    // System button toggles the menu. Open from closed starts on the Resume
    // tab; pressing system again (open) closes.
    if (action === 'system') {
      soundManager.playSelectionSound();
      if (systemMenuOpenRef.current) {
        setSystemMenuOpen(false);
      } else {
        setSystemMenuInitialTab('resume');
        setSystemMenuOpen(true);
      }
      return;
    }
    // When the menu is open, ok/back are consumed by the menu.
    if (systemMenuOpenRef.current) {
      if (action === 'ok' || action === 'back') {
        systemMenuRef.current?.action(action);
      }
      return;
    }
    // Hub owns OK/Back (panel-aware). Back closes the game-info panel if open;
    // otherwise it falls through to the exit menu (hub is a boundary screen).
    if (currentScreen === 'hub') {
      if (action === 'ok') {
        hubRef.current?.action('ok');
        return;
      }
      if (action === 'back') {
        // Hub consumes Back to close a modal or escalate toward the top nav;
        // only when it doesn't (focus already at the top) do we open the exit menu.
        if (hubRef.current?.wantsBack()) {
          hubRef.current.action('back');
          return;
        }
        setSystemMenuInitialTab('exit');
        setSystemMenuOpen(true);
        return;
      }
      return;
    }
    // Back on other boundary screens (game-menu) opens the exit tab directly.
    if (action === 'back' && BOUNDARY_SCREENS.has(currentScreen)) {
      setSystemMenuInitialTab('exit');
      setSystemMenuOpen(true);
      return;
    }
    if (currentScreen === 'party-playlist-select') {
      partyPlaylistRef.current?.action(action);
      return;
    }
    if (currentScreen === 'studio') {
      // Exit confirmation is modal — it owns ok/back while shown.
      if (studioExitConfirmRef.current) {
        if (action === 'ok') {
          soundManager.playSelectionSound();
          if (studioExitFocusRef.current === 1) {
            // Leave: tear down the studio and return to the hub.
            setStudioExitConfirm(false);
            setStudioPlay(null);
            setCurrentScreen('hub');
          } else {
            setStudioExitConfirm(false);
          }
        } else if (action === 'back') {
          setStudioExitConfirm(false);
        }
        return;
      }
      // Gameplay: OK selects the focused option / restarts on results.
      if (studioPhaseRef.current === 'playing') {
        const play = studioPlayRef.current;
        if (action === 'ok') {
          if (play?.status === 'question') {
            setStudioPlay((prev) => revealStudioAnswer(prev, studioPlayFocusRef.current));
            soundManager.playSelectionSound();
          } else if (play?.status === 'results') {
            setStudioPlayFocus(0);
            setStudioPlay(buildStudioRound());
            soundManager.playSelectionSound();
          }
        } else if (action === 'back') {
          setStudioPlay(null);
          setStudioPhase('game');
        }
        return;
      }
      // Creation phases: Back on the game preview asks to leave; on the earlier
      // phases it exits straight to the hub. OK on connect is a solo-test aid.
      if (action === 'back') {
        if (studioPhaseRef.current === 'game') {
          setStudioExitFocus(0);
          setStudioExitConfirm(true);
          soundManager.playSelectionSound();
        } else {
          setCurrentScreen('hub');
        }
      } else if (action === 'ok' && studioPhaseRef.current === 'connect') {
        setStudioPhase('prompt');
        soundManager.playSelectionSound();
      }
      return;
    }
    if (currentScreen === 'game-menu') {
      if (action === 'ok') {
        setMenuIsPressing(true);
        setTimeout(() => setMenuIsPressing(false), 150);
        soundManager.playSelectionSound();

        // Launch Single Player playlist selection
        if (menuFocusedIndex === 0) {
          setTimeout(() => setCurrentScreen('playlist-select'), 150);
        } else if (menuFocusedIndex === 1) {
          // Party Mode → multi-playlist (1–3) selection
          setTimeout(() => setCurrentScreen('party-playlist-select'), 150);
        }
      }
      // back on game-menu is handled as a boundary above (opens exit menu)
    } else if (currentScreen === 'playlist-select') {
      if (action === 'ok') {
        setPlaylistIsPressing(true);
        setTimeout(() => setPlaylistIsPressing(false), 150);
        soundManager.playSelectionSound();
        // TODO: start quiz with selected playlist
      } else if (action === 'back') {
        setCurrentScreen('game-menu');
        setPlaylistFocusRow(0);
        setPlaylistFocusCol(0);
        setPlaylistBounceDirection(null);
      }
    }
  }, [currentScreen, menuFocusedIndex]);

  // Handle navigation input from mobile
  const handleNavigationInput = useCallback(
    (payload: NavigationInputPayload) => {
      if (!audioUnlockedRef.current) {
        soundManager.unlockAudio();
        audioUnlockedRef.current = true;
      }

      if (payload.type === 'navigate' && payload.direction) {
        handleNavigate(payload.direction);
      } else if (payload.type === 'action' && payload.action) {
        handleAction(payload.action);
      }
    },
    [handleNavigate, handleAction]
  );

  const { socket, roomCode, connectionStatus } = useSocket(handleNavigationInput);
  const roomCodeRef = useRef(roomCode);
  roomCodeRef.current = roomCode;

  // Voice integration ------------------------------------------------------
  // Mobile streams transcripts → TV runs the matcher with a screen-aware
  // candidate set → TV executes (high confidence) or asks mobile to TTS-confirm
  // (medium confidence). Fuzzy candidates today are just the hub games; other
  // screens fall through to verb-only matching.

  const currentScreenRef = useRef<AppScreen>(currentScreen);
  useEffect(() => { currentScreenRef.current = currentScreen; }, [currentScreen]);

  const pendingVoiceIntentRef = useRef<{ id: string; intent: VoiceIntent } | null>(null);

  // Defense-in-depth dedupe: SFSpeechRecognizer can fire interim+final for the
  // same phrase, and StrictMode-era subscriptions can echo. We drop a transcript
  // if the same text arrived in the last 1.5s.
  const lastVoiceEmitRef = useRef<{ text: string; ts: number } | null>(null);

  // Debug state — TODO remove once voice is stable.
  const [voiceDebugEvents, setVoiceDebugEvents] = useState<TVVoiceDebugEvent[]>([]);
  const [pendingPromptText, setPendingPromptText] = useState<string | null>(null);
  const [pendingPromptConfirmed, setPendingPromptConfirmed] = useState<
    'pending' | 'yes' | 'no' | 'timeout' | null
  >(null);

  const VOICE_EXECUTE_THRESHOLD = 0.65;

  const executeVoiceIntent = useCallback((intent: VoiceIntent) => {
    if (intent.kind === 'navigate') {
      handleNavigate(intent.direction);
      return;
    }
    if (intent.kind === 'action') {
      handleAction(intent.action);
      return;
    }
    // goto — focus the target tile, optionally chain into ok ("play X").
    // The hub owns focus + launch; it fires onLaunch when autoLaunch is set.
    hubRef.current?.focusGame(intent.targetId, intent.autoLaunch);
  }, [handleNavigate, handleAction]);

  useEffect(() => {
    if (!socket || !roomCode) return;
    let promptCounter = 0;

    const buildContext = () => {
      if (currentScreenRef.current === 'hub') {
        return { candidates: HUB_GAMES.map((g) => ({ id: g.id, label: g.title })) };
      }
      return { candidates: [] as { id: string; label: string }[] };
    };

    const promptFor = (intent: VoiceIntent): string => {
      if (intent.kind === 'goto') return `Did you mean ${intent.targetLabel}?`;
      if (intent.kind === 'navigate') return `Move ${intent.direction}?`;
      return `Did you say ${intent.action}?`;
    };

    let debugCounter = 0;
    const pushDebug = (e: Omit<TVVoiceDebugEvent, 'id' | 'ts'>) => {
      setVoiceDebugEvents((prev) => [
        { id: ++debugCounter, ts: Date.now(), ...e },
        ...prev,
      ].slice(0, 8));
    };

    const onTranscript = (payload: VoiceTranscriptPayload) => {
      if (!payload.isFinal) return;

      const now = Date.now();
      const last = lastVoiceEmitRef.current;
      if (last && last.text === payload.transcript && now - last.ts < 3000) {
        console.log('[TV voice] dedupe drop', payload.transcript);
        return;
      }
      lastVoiceEmitRef.current = { text: payload.transcript, ts: now };

      const intent = matchVoice(payload.transcript, buildContext());
      console.log('[TV voice]', payload.transcript, '→', intent);

      if (!intent) {
        pushDebug({
          transcript: payload.transcript,
          recognizerConfidence: payload.recognizerConfidence,
          intent: null,
          decision: 'ignore',
        });
        return;
      }

      if (intent.confidence >= VOICE_EXECUTE_THRESHOLD) {
        pushDebug({
          transcript: payload.transcript,
          recognizerConfidence: payload.recognizerConfidence,
          intent,
          decision: 'execute',
        });
        executeVoiceIntent(intent);
        return;
      }

      // Medium confidence — ask the user to confirm via mobile TTS.
      const promptId = `tv-${Date.now()}-${++promptCounter}`;
      pendingVoiceIntentRef.current = { id: promptId, intent };
      const promptText = promptFor(intent);
      setPendingPromptText(promptText);
      setPendingPromptConfirmed('pending');
      pushDebug({
        transcript: payload.transcript,
        recognizerConfidence: payload.recognizerConfidence,
        intent,
        decision: 'confirm',
      });
      socket.emit(SOCKET_EVENTS.VOICE_CONFIRM_PROMPT, {
        roomCode,
        prompt: promptText,
        promptId,
      });
    };

    const onConfirmResponse = (payload: VoiceConfirmResponsePayload) => {
      const pending = pendingVoiceIntentRef.current;
      if (!pending || pending.id !== payload.promptId) return;
      pendingVoiceIntentRef.current = null;
      const verdict =
        payload.confirmed === true ? 'yes' : payload.confirmed === false ? 'no' : 'timeout';
      setPendingPromptConfirmed(verdict);
      // Clear the banner after a beat so the next prompt has a clean slate.
      setTimeout(() => {
        setPendingPromptText(null);
        setPendingPromptConfirmed(null);
      }, 1200);
      if (payload.confirmed === true) executeVoiceIntent(pending.intent);
    };

    socket.on(SOCKET_EVENTS.VOICE_TRANSCRIPT, onTranscript);
    socket.on(SOCKET_EVENTS.VOICE_CONFIRM_RESPONSE, onConfirmResponse);
    return () => {
      socket.off(SOCKET_EVENTS.VOICE_TRANSCRIPT, onTranscript);
      socket.off(SOCKET_EVENTS.VOICE_CONFIRM_RESPONSE, onConfirmResponse);
    };
  }, [socket, roomCode, executeVoiceIntent]);

  // Mock slots — real party/slot domain state lands in PU&P M2.
  // Mixed states so the system-menu visual treatment can be seen end-to-end
  // before real party/slot plumbing exists.
  // TODO(PU&P M2): wire to actual party state instead of placeholders.
  const mockSlots: Slot[] = [
    { id: '1', state: 'connected',  name: WEEKEND_PLAYERS[0].name, colorHex: WEEKEND_PLAYERS[0].colorHex },
    { id: '2', state: 'connected',  name: WEEKEND_PLAYERS[1].name, colorHex: WEEKEND_PLAYERS[1].colorHex },
    { id: '3', state: 'connecting' },
    { id: '4', state: 'waiting' },
  ];

  // Mobile now sends a unified 'system' NavigationAction (handled in
  // handleAction above) instead of a dedicated SYSTEM_MENU_OPEN socket event,
  // so no listener is needed here.

  // Emit close back to mobile whenever user dismisses the overlay
  const handleMenuOpenChange = useCallback((next: boolean) => {
    setSystemMenuOpen(next);
    if (!next && socket) socket.emit(SOCKET_EVENTS.SYSTEM_MENU_CLOSE);
  }, [socket]);

  // Map current screen → Exit tab content. Hub gets a confirm dialog; all
  // other screens get the tile variant with an Exit tile + launch shortcuts
  // for the other hub games (Song Quiz goes under in-game → swap-mode tiles
  // once real mode data is wired up for PU&P).
  const exitTab: ExitTabContent = useMemo(() => {
    if (currentScreen === 'hub') {
      return {
        variant: 'confirm',
        title: 'Leave the app?',
        description: "You'll exit Weekend and return to your TV's home screen.",
      };
    }
    // Feature the newest titles (e.g. Wit's End) first. 3 hub-style tiles.
    const launchGames = [...games].filter((g) => g.id !== 'game-1').reverse().slice(0, 3);
    return {
      variant: 'tiles',
      prompt: 'Are you sure you want to exit?',
      actions: [
        { id: 'exit', label: 'Exit Game', kind: 'exit' },
        ...launchGames.map((g) => ({
          id: `launch-${g.id}`,
          label: g.title,
          title: g.title,
          backgroundColor: g.backgroundColor,
          kind: 'launch' as const,
        })),
      ],
    };
  }, [currentScreen, games]);

  const handleExitAction = useCallback((action: ExitAction) => {
    handleMenuOpenChange(false);
    if (action.kind === 'exit') {
      setCurrentScreen('hub');
      return;
    }
    // Launch action — for now, jump to loading which leads into Song Quiz's
    // flow. Proper multi-game launch lands with PU&P session plumbing.
    setCurrentScreen('loading');
  }, [handleMenuOpenChange]);

  // Hub OK / voice "play X" → launch. Only Song Quiz has a real flow today;
  // every launch routes through the shared loading screen for now.
  const handleHubLaunch = useCallback(() => {
    setHubInitialPage('home'); // a hub-game launch returns to Home on exit
    setCurrentScreen('loading');
  }, []);

  // Broadcast screen state to mobile devices
  useEffect(() => {
    if (socket) {
      socket.emit(SOCKET_EVENTS.SCREEN_UPDATE, { screen: currentScreen });
    }
  }, [currentScreen, socket]);

  // ── Studio wiring ───────────────────────────────────────────────────────────
  // Push the current studio phase + version + built-game info to the phone so it
  // renders the matching controller. (SCREEN_UPDATE above already tells it we're
  // in Studio.)
  useEffect(() => {
    if (!socket || !roomCode || currentScreen !== 'studio') return;
    socket.emit(SOCKET_EVENTS.STUDIO_STATE, {
      roomCode,
      phase: studioPhase,
      version: studioVersion,
      title: studioTitle,
      kind: studioKind,
      idea: studioIdea,
      exitConfirm: studioExitConfirm,
    });
  }, [socket, roomCode, currentScreen, studioPhase, studioVersion, studioTitle, studioKind, studioIdea, studioExitConfirm]);

  // Push live gameplay state to the phone whenever it changes.
  useEffect(() => {
    if (!socket || !roomCode || currentScreen !== 'studio' || studioPhase !== 'playing' || !studioPlay) return;
    socket.emit(SOCKET_EVENTS.STUDIO_GAME_STATE, studioGamePayload(roomCode, studioPlay));
  }, [socket, roomCode, currentScreen, studioPhase, studioPlay]);

  // Faked build: while generating, wait STUDIO_GEN_MS then play the reveal —
  // v1 for a first create, or a version bump for an iteration.
  useEffect(() => {
    if (currentScreen !== 'studio' || studioPhase !== 'generating') return;
    const t = setTimeout(() => {
      setStudioVersion((v) => (studioSubmitModeRef.current === 'create' ? 1 : v + 1));
      setStudioPhase('reveal');
      soundManager.playSelectionSound(); // the game-tile pop
    }, STUDIO_GEN_MS);
    return () => clearTimeout(t);
  }, [currentScreen, studioPhase]);

  // Reveal: the game-tile breathes for a beat, then the preview fades in.
  useEffect(() => {
    if (currentScreen !== 'studio' || studioPhase !== 'reveal') return;
    const t = setTimeout(() => setStudioPhase('game'), STUDIO_REVEAL_MS_TILE);
    return () => clearTimeout(t);
  }, [currentScreen, studioPhase]);

  // Gameplay: after an answer is revealed, linger, then advance to the next
  // question or finish with the results screen.
  useEffect(() => {
    if (currentScreen !== 'studio' || studioPhase !== 'playing') return;
    if (!studioPlay || studioPlay.status !== 'reveal') return;
    const t = setTimeout(() => {
      setStudioPlay((prev) => {
        if (!prev) return prev;
        const next = prev.questionIndex + 1;
        if (next >= prev.questions.length) return { ...prev, status: 'results' };
        return { ...prev, status: 'question', questionIndex: next, selectedIndex: null };
      });
      setStudioPlayFocus(0); // fresh cursor for the next question
    }, STUDIO_REVEAL_MS);
    return () => clearTimeout(t);
  }, [currentScreen, studioPhase, studioPlay]);

  // Phone → TV studio events: idea/iteration submit, discrete actions, mic
  // state, and in-game answers.
  useEffect(() => {
    if (!socket) return;
    const onSubmit = (p: StudioSubmitPayload) => {
      if (currentScreenRef.current !== 'studio') return;
      studioSubmitModeRef.current = p.mode;
      // A first create derives the game (title/kind) from the idea (C2); an
      // iteration keeps the same game and just bumps the version.
      if (p.mode === 'create') {
        const { title, kind } = deriveStudioGame(p.text);
        setStudioIdea(p.text);
        setStudioTitle(title);
        setStudioKind(kind);
        // Cache it so it appears as a tile in the Studio "My games" row.
        const id = `studio-${studioGameSeqRef.current++}`;
        setStudioCreatedGames((prev) => [{ id, title, kind, idea: p.text }, ...prev]);
      }
      setStudioListening(false);
      // A (re)build always restarts the game from its pair/preview page — never
      // resume where it was last played.
      setStudioPlay(null);
      setStudioPlayFocus(0);
      setStudioPhase('generating');
      soundManager.playSelectionSound();
    };
    const onAction = (p: StudioActionPayload) => {
      if (currentScreenRef.current !== 'studio') return;
      if (p.action === 'ready') {
        // The phone mounted the studio controller → advance past the QR screen.
        setStudioPhase((prev) => (prev === 'connect' ? 'prompt' : prev));
      } else if (p.action === 'start' || p.action === 'play-again') {
        // Launch (or restart) the real, phone-controlled round.
        setStudioPlayFocus(0);
        setStudioPlay(buildStudioRound());
        setStudioPhase('playing');
        soundManager.playSelectionSound();
      } else if (p.action === 'quit-game') {
        setStudioPlay(null);
        setStudioPhase('game');
      } else if (p.action === 'request-exit') {
        // Phone's Back button on the game preview → show the leave confirmation.
        setStudioExitFocus(0);
        setStudioExitConfirm(true);
        soundManager.playSelectionSound();
      } else if (p.action === 'develop-tab') {
        setStudioDeveloping(true);
      } else if (p.action === 'controller-tab') {
        setStudioDeveloping(false);
      }
    };
    const onAnswer = (p: StudioAnswerPayload) => {
      if (currentScreenRef.current !== 'studio') return;
      // First answer for the current question locks it in (prototype: room-wide).
      setStudioPlay((prev) => revealStudioAnswer(prev, p.index));
      soundManager.playSelectionSound();
    };
    const onVoiceState = (p: VoiceStatePayload) => {
      if (currentScreenRef.current !== 'studio') return;
      setStudioListening(p.state === 'listening');
    };
    socket.on(SOCKET_EVENTS.STUDIO_SUBMIT, onSubmit);
    socket.on(SOCKET_EVENTS.STUDIO_ACTION, onAction);
    socket.on(SOCKET_EVENTS.STUDIO_ANSWER, onAnswer);
    socket.on(SOCKET_EVENTS.VOICE_STATE, onVoiceState);
    return () => {
      socket.off(SOCKET_EVENTS.STUDIO_SUBMIT, onSubmit);
      socket.off(SOCKET_EVENTS.STUDIO_ACTION, onAction);
      socket.off(SOCKET_EVENTS.STUDIO_ANSWER, onAnswer);
      socket.off(SOCKET_EVENTS.VOICE_STATE, onVoiceState);
    };
  }, [socket]);

  // B1: re-sync a freshly joined / reconnected phone with the TV's current
  // screen (and studio + gameplay state), so it never gets stuck on the default
  // hub D-pad while the TV is deeper in a flow.
  useEffect(() => {
    if (!socket) return;
    const onJoined = (p: { success: boolean }) => {
      if (!p?.success) return;
      socket.emit(SOCKET_EVENTS.SCREEN_UPDATE, { screen: currentScreenRef.current });
      if (currentScreenRef.current !== 'studio' || !roomCodeRef.current) return;
      socket.emit(SOCKET_EVENTS.STUDIO_STATE, {
        roomCode: roomCodeRef.current,
        phase: studioPhaseRef.current,
        version: studioVersionRef.current,
        title: studioTitleRef.current,
        kind: studioKindRef.current,
        idea: studioIdeaRef.current,
        exitConfirm: studioExitConfirmRef.current,
      });
      if (studioPhaseRef.current === 'playing' && studioPlayRef.current) {
        socket.emit(SOCKET_EVENTS.STUDIO_GAME_STATE, studioGamePayload(roomCodeRef.current, studioPlayRef.current));
      }
    };
    socket.on(SOCKET_EVENTS.ROOM_JOINED, onJoined);
    return () => {
      socket.off(SOCKET_EVENTS.ROOM_JOINED, onJoined);
    };
  }, [socket]);

  // Keyboard nav at app level (works on all screens)
  useKeyboardNav({ onNavigate: handleNavigate, onAction: handleAction });

  if (!connectionStatus.connected || !roomCode) {
    return (
      <div className="w-full h-full bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-pulse">📡</div>
          <h1 className="text-5xl font-bold mb-4">Connecting to Server...</h1>
          <p className="text-2xl text-gray-400">Please wait</p>
        </div>
      </div>
    );
  }

  let screen;
  if (currentScreen === 'loading') {
    screen = <LoadingScreen />;
  } else if (currentScreen === 'game-menu') {
    screen = (
      <GameMenu
        focusedIndex={menuFocusedIndex}
        bounceDirection={menuBounceDirection}
        isPressing={menuIsPressing}
      />
    );
  } else if (currentScreen === 'playlist-select') {
    screen = (
      <PlaylistSelect
        focusRow={playlistFocusRow}
        focusCol={playlistFocusCol}
        bounceDirection={playlistBounceDirection}
        isPressing={playlistIsPressing}
      />
    );
  } else if (currentScreen === 'party-playlist-select') {
    screen = (
      <PartyPlaylistSelect
        ref={partyPlaylistRef}
        onExit={() => setCurrentScreen('game-menu')}
        onSubmit={(ids) => {
          console.log('[Party] submit playlists', ids);
          // TODO: start the party quiz with the selected playlists.
          setTimeout(() => setCurrentScreen('loading'), 150);
        }}
      />
    );
  } else if (currentScreen === 'studio') {
    screen = (
      <>
        {studioPhase === 'playing' && studioPlay ? (
          <StudioPlay
            title={studioTitle || 'YOUR GAME'}
            status={studioPlay.status}
            questionIndex={studioPlay.questionIndex}
            totalQuestions={studioPlay.questions.length}
            question={studioPlay.questions[studioPlay.questionIndex]}
            selectedIndex={studioPlay.selectedIndex}
            focusedIndex={studioPlayFocus}
            score={studioPlay.score}
          />
        ) : (
          <StudioView
            phase={studioPhase}
            version={studioVersion}
            roomCode={roomCode}
            mobileUrl={`${getMobileUrl()}?code=${roomCode}`}
            genMs={STUDIO_GEN_MS}
            listening={studioListening}
            title={studioTitle}
            idea={studioIdea}
          />
        )}
        {/* The game master overlays the built game as a faded dev-mode indicator;
            it brightens while the phone's Develop tool is open. */}
        {(studioPhase === 'game' || studioPhase === 'playing') && (
          <GameMasterGlobe mode="overlay" variant="corner" dim={studioDeveloping ? 1 : 0.5} listening={studioListening} />
        )}
        {studioExitConfirm && <StudioExitConfirm focus={studioExitFocus} />}
      </>
    );
  } else {
    screen = (
      <GameHub
        ref={hubRef}
        roomCode={roomCode}
        onLaunch={handleHubLaunch}
        onCreateGame={handleCreateGame}
        createdGames={studioCreatedGames}
        initialPage={hubInitialPage}
        showPairing={showPairing}
        phase={hubPhase}
        variation={hubVariation}
        frame
      />
    );
  }

  return (
    <>
      {screen}
      {showDebug && (
        <VoiceDebugOverlay
          events={voiceDebugEvents}
          pendingPromptText={pendingPromptText}
          pendingPromptConfirmed={pendingPromptConfirmed}
        />
      )}
      <SystemMenuOverlay
        ref={systemMenuRef}
        open={systemMenuOpen}
        onOpenChange={handleMenuOpenChange}
        mobileUrl={getMobileUrl()}
        roomCode={roomCode}
        slots={mockSlots}
        exitTab={exitTab}
        initialTab={systemMenuInitialTab}
        onResume={() => handleMenuOpenChange(false)}
        onExitAction={handleExitAction}
        onNavigate={() => soundManager.playNavigationSound()}
        onBounce={() => soundManager.playBounceSound()}
        onSelect={() => soundManager.playSelectionSound()}
      />
    </>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainTvApp />} />
      {import.meta.env.DEV && <Route path="/ui-preview/*" element={<PreviewShell />} />}
    </Routes>
  );
}

export default App;
