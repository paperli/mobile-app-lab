import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Mic, Undo2 } from 'lucide-react';
import { Button } from '@weekend/ui';
import {
  STUDIO_IDEAS,
  type StudioPhase,
  type StudioAction,
  type StudioGameStatePayload,
  type NavigationDirection,
  type NavigationAction,
} from '@mobile-app-lab/shared';
import { HapticFeedback } from '../../utils/haptics';
import { SquareController } from '../SquareController';
import { TopBar } from '../TopBar';
import { IdeaCarousel } from './IdeaCarousel';
import { type ChatMsg } from './DevelopChat';
import { DevelopFab } from './DevelopFab';

const CANARY = 'rgb(var(--palette-canary-500))';
const BG = 'radial-gradient(120% 80% at 50% 0%, #1a1442 0%, #0a0322 60%, #08060f 100%)';

export interface StudioControllerProps {
  phase: StudioPhase;
  version: number;
  /** Title of the built game (derived from the idea); falls back to a generic. */
  title?: string;
  /** Live gameplay state (only while phase==='playing'). */
  game?: StudioGameStatePayload | null;
  /** True while the TV shows the leave-confirmation → phone becomes a d-pad. */
  exitConfirm?: boolean;
  onSubmit: (text: string, mode: 'create' | 'iterate') => void;
  onAction: (action: StudioAction) => void;
  onVoiceState: (state: 'idle' | 'listening') => void;
  /** Standardized d-pad navigation → TV (gameplay + confirmations). */
  onNavigate: (direction: NavigationDirection) => void;
  onNavAction: (action: NavigationAction) => void;
}

export function StudioController({
  phase,
  version,
  title,
  exitConfirm,
  onSubmit,
  onAction,
  onVoiceState,
  onNavigate,
  onNavAction,
}: StudioControllerProps) {
  const gameName = title && title.trim() ? title : 'YOUR GAME';

  // Announce readiness once so the TV advances from the QR (connect) screen.
  const readyRef = useRef(false);
  useEffect(() => {
    if (!readyRef.current) {
      readyRef.current = true;
      onAction('ready');
    }
  }, [onAction]);

  // Develop chat log — persists across the whole Studio session (this component
  // stays mounted while the TV is in Studio).
  const [chatLog, setChatLog] = useState<ChatMsg[]>([
    { role: 'master', text: 'Your game is ready! Tap the ✨ wand any time to tweak it.' },
  ]);
  // One-time tooltip nudging the user toward Develop after the v1 build.
  const [hintDismissed, setHintDismissed] = useState(false);
  const dismissHint = () => setHintDismissed(true);
  const handleIterate = (text: string) => {
    setChatLog((prev) => [
      ...prev,
      { role: 'user', text },
      { role: 'master', text: 'On it — rebuilding your game…' },
    ]);
    onSubmit(text, 'iterate');
  };
  // Tell the TV when the Develop tool opens/closes (un-fades the game-master).
  const handleDevelopOpenChange = (open: boolean) => onAction(open ? 'develop-tab' : 'controller-tab');

  // Leave-confirmation: the phone is a plain d-pad to answer the TV modal.
  if (exitConfirm) {
    return (
      <Shell>
        <DpadArea onNavigate={onNavigate} onNavAction={onNavAction} caption="Confirm on your TV" />
      </Shell>
    );
  }

  if (phase === 'generating' || phase === 'reveal') {
    return (
      <Shell>
        <div style={{ margin: 'auto', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <div style={{ fontSize: 44 }}>✨</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Building your game…</div>
          <div style={{ fontSize: 15, color: 'rgba(243,244,241,0.6)' }}>Watch the TV — this takes a moment.</div>
        </div>
      </Shell>
    );
  }

  // Gameplay: standardized d-pad drives the answer cursor on the TV. Most of the
  // game info lives on the TV, so the phone is just the controller.
  if (phase === 'playing') {
    return (
      <GameScreen chatLog={chatLog} onIterate={handleIterate} onVoiceState={onVoiceState} onHintDismiss={dismissHint} onDevelopOpenChange={handleDevelopOpenChange}>
        <DpadArea onNavigate={onNavigate} onNavAction={onNavAction} onBack={() => onAction('quit-game')} caption="Answer on the TV" />
      </GameScreen>
    );
  }

  // Game preview: the big Start button + a back button that asks to leave.
  if (phase === 'game') {
    return (
      <GameScreen
        chatLog={chatLog}
        onIterate={handleIterate}
        onVoiceState={onVoiceState}
        showHint={version === 1 && !hintDismissed}
        onHintDismiss={dismissHint}
        onDevelopOpenChange={handleDevelopOpenChange}
      >
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(243,244,241,0.5)' }}>
            {gameName} · v{version}
          </div>
          <button
            onClick={() => {
              HapticFeedback.heavy();
              onAction('start');
            }}
            aria-label="Start"
            style={{
              width: 200,
              height: 200,
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              background: CANARY,
              color: '#1a1400',
              fontSize: 34,
              fontWeight: 800,
              boxShadow: '0 12px 40px rgba(255,218,10,0.35)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Start
          </button>
          <div style={{ fontSize: 14, color: 'rgba(243,244,241,0.5)' }}>Tap to play your game</div>
          <BackButton onPress={() => onAction('request-exit')} />
        </div>
      </GameScreen>
    );
  }

  // connect + prompt → idea entry
  return <IdeaEntry mode="create" onSubmit={onSubmit} onVoiceState={onVoiceState} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: BG,
        color: '#F3F4F1',
        fontFamily: "'Weekend Repro', ui-sans-serif, system-ui, sans-serif",
        padding: 'max(env(safe-area-inset-top), 20px) 20px max(env(safe-area-inset-bottom), 20px)',
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  );
}

// Shared chrome for the game screens: top nav bar + the persistent Develop wand.
function GameScreen({
  children,
  chatLog,
  onIterate,
  onVoiceState,
  showHint = false,
  onHintDismiss,
  onDevelopOpenChange,
}: {
  children: React.ReactNode;
  chatLog: ChatMsg[];
  onIterate: (text: string) => void;
  onVoiceState: (state: 'idle' | 'listening') => void;
  showHint?: boolean;
  onHintDismiss?: () => void;
  onDevelopOpenChange?: (open: boolean) => void;
}) {
  return (
    <Shell>
      {/* Top nav bar (not wired to TV actions yet). */}
      <TopBar onSystem={() => {}} onSettings={() => {}} />
      {children}
      <DevelopFab
        log={chatLog}
        onSend={onIterate}
        onVoiceState={onVoiceState}
        showHint={showHint}
        onHintDismiss={onHintDismiss}
        onOpenChange={onDevelopOpenChange}
      />
    </Shell>
  );
}

// The standardized d-pad, with an optional back button below it.
function DpadArea({
  onNavigate,
  onNavAction,
  onBack,
  caption,
}: {
  onNavigate: (direction: NavigationDirection) => void;
  onNavAction: (action: NavigationAction) => void;
  onBack?: () => void;
  caption?: string;
}) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <div style={{ width: '100%', flex: '0 1 380px', minHeight: 300 }}>
        <SquareController onNavigate={onNavigate} onAction={onNavAction} />
      </div>
      {caption && <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(243,244,241,0.5)' }}>{caption}</div>}
      {onBack && <BackButton onPress={onBack} />}
    </div>
  );
}

// Circular back button matching the standardized d-pad's back affordance.
function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Button
      variant="secondary"
      size="circular"
      onClick={() => {
        HapticFeedback.light();
        onPress();
      }}
    >
      <Undo2 size={40} strokeWidth={2} />
    </Button>
  );
}

/**
 * The idea-entry controller: a prompt, an auto-scrolling idea carousel, and a
 * text field with a mic (right). The mic is faked — hold it to "listen", release
 * to drop a random pre-generated idea into the field. Send submits the idea.
 */
export function IdeaEntry({
  mode,
  onSubmit,
  onVoiceState,
  prompt = 'Hold the mic button to speak, or type in your game idea to create.',
}: {
  mode: 'create' | 'iterate';
  onSubmit: (text: string, mode: 'create' | 'iterate') => void;
  onVoiceState: (state: 'idle' | 'listening') => void;
  prompt?: string;
}) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);

  const startListening = () => {
    setListening(true);
    onVoiceState('listening');
    HapticFeedback.medium();
  };
  const stopListening = () => {
    if (!listening) return;
    setListening(false);
    onVoiceState('idle');
    const idea = STUDIO_IDEAS[Math.floor(Math.random() * STUDIO_IDEAS.length)];
    setText(idea);
    HapticFeedback.success();
  };

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    HapticFeedback.medium();
    onSubmit(t, mode);
    setText('');
  };

  return (
    <Shell>
      <p style={{ fontSize: 17, lineHeight: 1.35, color: 'rgba(243,244,241,0.85)', margin: '4px 0 20px', textAlign: 'center' }}>
        {prompt}
      </p>

      <div style={{ margin: 'auto 0' }}>
        <IdeaCarousel ideas={STUDIO_IDEAS} onPick={(idea) => setText(idea)} />
      </div>

      {/* Input + mic + send */}
      <div style={{ marginTop: 20 }}>
        {listening && (
          <div style={{ textAlign: 'center', marginBottom: 10, fontSize: 15, fontWeight: 700, color: CANARY }}>
            listening…
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describe your game idea…"
            rows={2}
            style={{
              flex: 1,
              resize: 'none',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.06)',
              color: '#F3F4F1',
              fontSize: 16,
              lineHeight: 1.3,
              padding: '14px 16px',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          {text.trim() ? (
            <button
              onClick={submit}
              aria-label="Send"
              style={{
                flex: '0 0 auto',
                width: 56,
                height: 56,
                borderRadius: '50%',
                border: 'none',
                background: CANARY,
                color: '#1a1400',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <ArrowUp size={26} strokeWidth={2.6} />
            </button>
          ) : (
            <button
              aria-label="Hold to speak"
              onPointerDown={startListening}
              onPointerUp={stopListening}
              onPointerLeave={stopListening}
              onPointerCancel={stopListening}
              style={{
                flex: '0 0 auto',
                width: 56,
                height: 56,
                borderRadius: '50%',
                border: listening ? `2px solid ${CANARY}` : '1px solid rgba(255,255,255,0.25)',
                background: listening ? 'rgba(255,218,10,0.18)' : 'rgba(255,255,255,0.08)',
                color: listening ? CANARY : '#F3F4F1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transform: listening ? 'scale(1.08)' : 'scale(1)',
                transition: 'transform 120ms ease',
                touchAction: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <Mic size={26} strokeWidth={2.4} />
            </button>
          )}
        </div>
      </div>
    </Shell>
  );
}
