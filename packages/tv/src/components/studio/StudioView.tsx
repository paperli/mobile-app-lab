import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { StudioPhase } from '@mobile-app-lab/shared';
import { GameMasterGlobe, type GlobeVariant } from './GameMasterGlobe';
import { Trophy3D } from './Trophy3D';

const FONT = "'Weekend Repro', ui-sans-serif, system-ui, sans-serif";
const INK = '#F3F4F1';
const CANARY = 'rgb(var(--palette-canary-500))';
const BG = '#07050f';

export interface StudioViewProps {
  phase: StudioPhase;
  /** Bumps on every generation (v1, v2, …); shown on the game preview. */
  version: number;
  roomCode: string;
  /** URL encoded into the QR (usually getMobileUrl()+?code=roomCode). */
  mobileUrl: string;
  /** Fake generation duration, so the progress bar matches the TV→game timer. */
  genMs: number;
  /** True while the phone is holding its mic (drives the game-master glow). */
  listening?: boolean;
  /** The built game's title (derived from the idea). Falls back per phase. */
  title?: string;
  /** The user's original idea text, shown on the game preview. */
  idea?: string;
}

// The 3D game master flows between screens: big hero on connect/prompt, medium
// while thinking, small in the corner on the game preview.
function variantForPhase(phase: StudioPhase): GlobeVariant {
  if (phase === 'generating') return 'thinking';
  if (phase === 'reveal' || phase === 'game' || phase === 'playing') return 'corner';
  return 'hero';
}

export function StudioView({ phase, version, roomCode, mobileUrl, genMs, listening = false, title, idea }: StudioViewProps) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: BG,
        color: INK,
        fontFamily: FONT,
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes gmCaretBlink { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }
        @keyframes gmBreathe { 0%,100% { transform: scale(1) } 50% { transform: scale(1.06) } }
        @keyframes gmFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes gmTilePop { from { opacity: 0; transform: scale(0.7) } to { opacity: 1; transform: scale(1) } }
      `}</style>
      {/* The Game Master — a glowing ghost-flame globe on a 3D dark scene. On the
          game preview it's rendered as an on-top overlay by App instead. */}
      {phase !== 'game' && <GameMasterGlobe variant={variantForPhase(phase)} listening={listening} />}

      {phase === 'connect' && <ConnectPhase mobileUrl={mobileUrl} roomCode={roomCode} />}
      {phase === 'prompt' && <PromptPhase />}
      {phase === 'generating' && <GeneratingPhase genMs={genMs} />}
      {phase === 'reveal' && <RevealPhase title={title} />}
      {phase === 'game' && <GamePhase version={version} mobileUrl={mobileUrl} roomCode={roomCode} listening={listening} title={title} idea={idea} />}
    </div>
  );
}

// Content sits above the full-bleed globe canvas.
const LAYER: React.CSSProperties = { position: 'absolute', inset: 0, zIndex: 1 };

// ── connect ───────────────────────────────────────────────────────────────────
function ConnectPhase({ mobileUrl, roomCode }: { mobileUrl: string; roomCode: string }) {
  return (
    <div style={{ ...LAYER, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 7vw' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4vh', maxWidth: '44vw' }}>
        <div style={{ background: '#fff', padding: 18, borderRadius: 20, lineHeight: 0 }}>
          <QRCodeSVG value={mobileUrl} size={260} level="M" includeMargin={false} />
        </div>
        <h1 style={{ margin: 0, fontSize: '3.4vw', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, textAlign: 'center' }}>
          Connect your phone to build your game, with your Voice!
        </h1>
        <p style={{ margin: 0, fontSize: '1.4vw', color: 'rgba(243,244,241,0.6)' }}>
          Scan the code — room <b style={{ color: CANARY, letterSpacing: '0.08em' }}>{roomCode}</b>
        </p>
      </div>
    </div>
  );
}

// ── prompt ──────────────────────────────────────────────────────────────────
const PROMPT_LEAD = 'What game idea do you have?';
const PROMPT_REST = ' Say it by holding the mic button on your phone, or type it.';
const PROMPT_FULL = PROMPT_LEAD + PROMPT_REST;

function PromptPhase() {
  // Type the prompt out on entry, with a bold caret blinking at the end.
  const n = useTypewriter(PROMPT_FULL, 40);
  const leadShown = PROMPT_FULL.slice(0, Math.min(n, PROMPT_LEAD.length));
  const restShown = n > PROMPT_LEAD.length ? PROMPT_FULL.slice(PROMPT_LEAD.length, n) : '';
  return (
    <div style={{ ...LAYER, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 8vw' }}>
      <h1 style={{ margin: 0, fontSize: '3.4vw', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15, maxWidth: '46vw' }}>
        {leadShown}
        <span style={{ color: 'rgba(243,244,241,0.7)', fontWeight: 600 }}>{restShown}</span>
        <span
          style={{
            display: 'inline-block',
            width: '0.09em',
            height: '1.05em',
            marginLeft: '0.06em',
            verticalAlign: '-0.15em',
            background: CANARY,
            borderRadius: 2,
            animation: 'gmCaretBlink 1s step-end infinite',
          }}
        />
      </h1>
    </div>
  );
}

// Reveals `text` one character at a time (restarts whenever it remounts).
function useTypewriter(text: string, msPerChar: number): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setN(i);
      if (i >= text.length) clearInterval(id);
    }, msPerChar);
    return () => clearInterval(id);
  }, [text, msPerChar]);
  return n;
}

// ── generating ────────────────────────────────────────────────────────────────
function GeneratingPhase({ genMs }: { genMs: number }) {
  const pct = useFakeProgress(genMs);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: '12vh', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4vh', padding: '0 8vw' }}>
      <h1 style={{ margin: 0, fontSize: '3vw', fontWeight: 800, letterSpacing: '-0.02em' }}>Building your game…</h1>
      <div style={{ width: '52vw', maxWidth: 900 }}>
        <div style={{ height: 18, borderRadius: 999, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              borderRadius: 999,
              background: `linear-gradient(90deg, rgb(var(--palette-canary-300)), ${CANARY})`,
              transition: 'width 120ms linear',
            }}
          />
        </div>
        <div style={{ marginTop: 14, textAlign: 'center', fontSize: '1.6vw', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: CANARY }}>
          {Math.round(pct)}%
        </div>
      </div>
    </div>
  );
}

// ── reveal (game-tile pop before the preview) ───────────────────────────────
function RevealPhase({ title }: { title?: string }) {
  return (
    <div style={{ ...LAYER, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3vh' }}>
      <div style={{ animation: 'gmTilePop 400ms cubic-bezier(.2,.8,.2,1) both' }}>
        <div
          style={{
            width: '34vw',
            height: '20vw',
            borderRadius: 20,
            background: 'linear-gradient(150deg, #241a5e 0%, #12093a 60%, #0a0322 100%)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 24px 70px rgba(0,0,0,0.55), 0 0 60px rgba(61,245,207,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 2vw',
            boxSizing: 'border-box',
            animation: 'gmBreathe 1.6s ease-in-out infinite',
          }}
        >
          <span style={{ fontSize: '2.6vw', fontWeight: 800, letterSpacing: '0.04em', color: CANARY, textAlign: 'center', textShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
            {title || 'YOUR GAME'}
          </span>
        </div>
      </div>
      <div style={{ fontSize: '1.5vw', fontWeight: 700, color: 'rgba(243,244,241,0.75)' }}>Your game is ready!</div>
    </div>
  );
}

// ── game (preview) ────────────────────────────────────────────────────────────
function GamePhase({
  version,
  mobileUrl,
  roomCode,
  listening,
  title,
  idea,
}: {
  version: number;
  mobileUrl: string;
  roomCode: string;
  listening: boolean;
  title?: string;
  idea?: string;
}) {
  return (
    <div style={{ ...LAYER, animation: 'gmFadeIn 650ms ease both' }}>
      {/* Version chip — top-left, bumps on each iteration. */}
      <div
        style={{
          position: 'absolute',
          top: '3vh',
          left: '2.5vw',
          zIndex: 4,
          padding: '8px 18px',
          borderRadius: 999,
          background: 'rgba(0,0,0,0.5)',
          border: `1.5px solid ${CANARY}`,
          color: CANARY,
          fontWeight: 800,
          fontSize: '1.3vw',
          letterSpacing: '0.06em',
        }}
      >
        v{version}
      </div>

      {/* Prominent game title + the idea it was built from. */}
      <div style={{ position: 'absolute', top: '3vh', left: 0, right: 0, textAlign: 'center', zIndex: 3 }}>
        <h1
          style={{
            margin: 0,
            fontSize: '5vw',
            fontWeight: 800,
            letterSpacing: '0.06em',
            color: CANARY,
            textShadow: '0 4px 24px rgba(0,0,0,0.6)',
          }}
        >
          {title || 'YOUR GAME'}
        </h1>
        {idea && (
          <p style={{ margin: '0.6vh auto 0', maxWidth: '60vw', fontSize: '1.3vw', color: 'rgba(243,244,241,0.6)' }}>
            “{idea}”
          </p>
        )}
      </div>

      {/* Game preview base — a celebratory 3D trophy + confetti for the created
          game. The game master globe floats on top as a small dev indicator. */}
      <div style={{ position: 'absolute', top: '10vh', left: '4vw', right: '4vw', bottom: '18vh' }}>
        <Trophy3D scale={1.25} />
      </div>

      {/* "listening…" caption near the corner globe. */}
      {listening && (
        <div style={{ position: 'absolute', right: '7vw', bottom: '25vh', zIndex: 7, fontSize: '1.1vw', fontWeight: 700, color: CANARY, textShadow: '0 0 12px rgba(61,245,207,0.6)' }}>
          listening…
        </div>
      )}

      {/* Bottom connect banner — QR + instructions. Half-width, raised. */}
      <div
        style={{
          position: 'absolute',
          left: '4vw',
          width: '42vw',
          bottom: '6vh',
          borderRadius: 24,
          background: 'rgba(10,3,34,0.72)',
          border: '1px solid rgba(255,255,255,0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: '2vw',
          padding: '2.4vh 2.6vw',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ background: '#fff', padding: 12, borderRadius: 16, lineHeight: 0, flex: '0 0 auto' }}>
          <QRCodeSVG value={mobileUrl} size={150} level="M" includeMargin={false} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1vh' }}>
          <div style={{ fontSize: '2vw', fontWeight: 800 }}>Join the game</div>
          <div style={{ fontSize: '1.3vw', color: 'rgba(243,244,241,0.65)' }}>Scan to connect</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7vw' }}>
            <span style={{ fontSize: '1.3vw', color: 'rgba(243,244,241,0.65)' }}>room</span>
            <span
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '1.7vw',
                fontWeight: 800,
                letterSpacing: '0.18em',
                color: CANARY,
                background: 'rgba(255,255,255,0.06)',
                border: '1.5px solid rgba(255,218,10,0.45)',
                borderRadius: 10,
                padding: '0.5vh 1vw',
              }}
            >
              {roomCode}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Drives a 0→100 progress value over `genMs` (visual only, restarts on mount).
function useFakeProgress(genMs: number): number {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const p = Math.min(100, ((performance.now() - start) / genMs) * 100);
      setPct(p);
      if (p < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [genMs]);
  return pct;
}
