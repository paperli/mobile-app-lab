// Static demo harness for GitHub Pages. Renders the GameHub layout options
// without a WebSocket server: pairing is mocked, launching shows a toast, and
// the D-pad is driven from the keyboard. `?phase=&variation=` selects a layout;
// with no params it shows a gallery of the options.
import { useEffect, useRef, useState } from 'react';
import { GameHub, type HubHandle } from '../components/GameHub';
import type { HubGame } from '../prototype/hub/games';

interface LayoutOption {
  phase: number;
  variation: number;
  name: string;
  tagline: string;
  desc: string;
}

const OPTIONS: LayoutOption[] = [
  {
    phase: 1,
    variation: 1,
    name: 'Phase 1 · Variation 1',
    tagline: 'Full hub',
    desc: 'Hero carousel (with the free-trial promo), “New on Weekend” with a See-all-games tile, Games That Go Viral, genre shelves and the trial banner.',
  },
  {
    phase: 1,
    variation: 2,
    name: 'Phase 1 · Variation 2',
    tagline: 'Highlights + All Games grid',
    desc: 'Two highlight shelves plus a full All Games grid. OK opens a game-info side panel; adding a favorite surfaces a Favorites row.',
  },
  {
    phase: 1,
    variation: 3,
    name: 'Phase 1 · Variation 3',
    tagline: 'Focus preview',
    desc: 'Keeps the large hero, but the top area previews whichever game is focused below. OK launches the game directly (no panel).',
  },
  {
    phase: 0,
    variation: 1,
    name: 'Phase 0 · Variation 1',
    tagline: 'Grid-only browse',
    desc: 'Stripped-down layout: the hero (with promo) sits above a single titled All Games grid, with the trial banner beneath it.',
  },
];

const FONT = "'Weekend Repro', ui-sans-serif, system-ui, sans-serif";

function optionHref(o: LayoutOption): string {
  const p = new URLSearchParams();
  if (o.phase !== 1) p.set('phase', String(o.phase));
  p.set('variation', String(o.variation));
  return `?${p.toString()}`;
}

export default function DemoApp() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('variation') && !params.has('phase')) return <Gallery />;
  const phase = params.has('phase') ? Number(params.get('phase')) : 1;
  const variation = params.has('variation') ? Number(params.get('variation')) : 1;
  const pairing = params.get('pairing') === 'true';
  return <HubView phase={phase} variation={variation} pairing={pairing} />;
}

function HubView({ phase, variation, pairing }: { phase: number; variation: number; pairing: boolean }) {
  const hubRef = useRef<HubHandle>(null);
  const [launching, setLaunching] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const h = hubRef.current;
      if (!h) return;
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          h.navigate('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          h.navigate('down');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          h.navigate('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          h.navigate('right');
          break;
        case 'Enter':
        case 'Return':
          e.preventDefault();
          h.action('ok');
          break;
        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          if (h.isPanelOpen()) h.action('back');
          else window.location.href = window.location.pathname; // back to the gallery
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <GameHub
        ref={hubRef}
        roomCode="WKND42"
        showPairing={pairing}
        phase={phase}
        variation={variation}
        onLaunch={(g: HubGame) => {
          setLaunching(g.title);
          window.setTimeout(() => setLaunching(null), 1400);
        }}
      />
      {launching && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(0,0,0,0.72)',
            color: '#f3f4f1',
            fontFamily: FONT,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em' }}>Launching {launching}…</div>
            <div style={{ marginTop: 10, fontSize: 16, color: '#b9babe' }}>(demo — no game to load)</div>
          </div>
        </div>
      )}
      <div
        style={{
          position: 'fixed',
          bottom: 12,
          left: 0,
          right: 0,
          zIndex: 90,
          textAlign: 'center',
          fontFamily: FONT,
          fontSize: 13,
          color: '#8a8a9a',
          pointerEvents: 'none',
        }}
      >
        ◀ ▲ ▼ ▶ navigate · Enter select · Esc back / gallery
      </div>
    </>
  );
}

function Gallery() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(120% 90% at 50% -10%, #101114 0%, #08090a 60%)',
        color: '#f3f4f1',
        fontFamily: FONT,
        padding: '72px 6vw 96px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 26, letterSpacing: '-0.02em' }}>weekend</div>
        <h1 style={{ margin: '28px 0 0', fontSize: 52, fontWeight: 800, letterSpacing: '-0.03em', textWrap: 'balance' }}>
          TV Hub — layout explorations
        </h1>
        <p style={{ margin: '16px 0 0', fontSize: 20, lineHeight: 1.5, color: 'rgba(243,244,241,0.72)', maxWidth: 720 }}>
          Black &amp; white prototypes of the game hub, driven by a TV remote (simulated with the keyboard). Pick a layout
          to explore it — <b>arrow keys</b> navigate, <b>Enter</b> selects, <b>Esc</b> goes back.
        </p>

        <div
          style={{
            marginTop: 48,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24,
          }}
        >
          {OPTIONS.map((o) => (
            <a
              key={`${o.phase}-${o.variation}`}
              href={optionHref(o)}
              style={{
                display: 'block',
                textDecoration: 'none',
                color: 'inherit',
                background: '#141518',
                border: '1px solid #2b2c30',
                borderRadius: 18,
                padding: '26px 26px 28px',
                transition: 'border-color 160ms ease, transform 160ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#6a6b70';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#2b2c30';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', color: '#8a8a9a', textTransform: 'uppercase' }}>
                {o.name}
              </div>
              <div style={{ marginTop: 10, fontSize: 26, fontWeight: 800, letterSpacing: '-0.01em' }}>{o.tagline}</div>
              <p style={{ margin: '12px 0 0', fontSize: 15.5, lineHeight: 1.5, color: 'rgba(243,244,241,0.68)' }}>{o.desc}</p>
              <div style={{ marginTop: 18, fontSize: 15, fontWeight: 700, color: '#f3f4f1' }}>Open →</div>
            </a>
          ))}
        </div>

        <p style={{ marginTop: 44, fontSize: 14, color: '#6b6c71' }}>
          Tip: append <code style={{ color: '#b9babe' }}>&amp;pairing=true</code> to any layout to show the QR pairing panel.
        </p>
      </div>
    </div>
  );
}
