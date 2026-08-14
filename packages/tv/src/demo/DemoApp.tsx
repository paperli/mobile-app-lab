// Static demo harness for GitHub Pages. Renders the GameHub layout options
// without a WebSocket server: pairing is mocked, launching shows a toast, and
// the D-pad is driven from the keyboard. `?phase=&variation=` selects a layout;
// with no params it shows a gallery of the options.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { GameHub, type HubHandle } from '../components/GameHub';
import type { HubGame } from '../prototype/hub/games';
import { HUB9_CONTENT } from '../prototype/hub9/games9';
import { HeroExample, SmallGameRow, LargeGameRow, PromoBanner, GameGridKit, SongQuizBanner } from './ComponentKit';
import Simulator from '../simulator/Simulator';
import HowItWorks from '../simulator/HowItWorks';

interface LayoutOption {
  phase: number;
  variation: number;
  name: string;
  tagline: string;
  desc: string;
  /** Optional colored flag pill on the gallery card (e.g. the chosen direction). */
  flag?: string;
}

const OPTIONS: LayoutOption[] = [
  {
    phase: 0,
    variation: 3,
    name: 'Phase 0 · Variation 3',
    tagline: 'Categorized rows',
    flag: 'GO THIS',
    desc: 'No top nav and a promo hero, but the full shelf set instead of a grid — New on Weekend (5 games + a See-all tile, each tagged NEW), Weekend Classic and the genre rows — with the trial banner. The focused game previews in the top area and OK launches it directly.',
  },
  {
    phase: 1,
    variation: 1,
    name: 'Phase 1 · Variation 1',
    tagline: 'Full hub',
    flag: 'GO THIS',
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
  {
    phase: 0,
    variation: 2,
    name: 'Phase 0 · Variation 2',
    tagline: 'Grid + side panel',
    desc: 'Same grid-only layout, but selecting a game opens the game-info side panel instead of previewing it in the top area.',
  },
];

const FONT = "'Weekend Repro', ui-sans-serif, system-ui, sans-serif";

// Canonical user-story form: As a [role], I want [goal], so that [benefit].
interface UserStory {
  role: string;
  want: string;
  benefit: string;
}

const USER_STORIES: UserStory[] = [
  {
    role: 'new user',
    want: 'explore the games available on Weekend',
    benefit: 'I can decide whether the free trial is worth starting',
  },
  {
    role: 'returning user',
    want: 'find and resume the games I’ve played before',
    benefit: 'I can jump straight back in without searching',
  },
  {
    role: 'returning user',
    want: 'discover games that are new to me',
    benefit: 'I keep finding fresh things to play',
  },
];

function optionHref(o: LayoutOption): string {
  const p = new URLSearchParams();
  if (o.phase !== 1) p.set('phase', String(o.phase));
  p.set('variation', String(o.variation));
  return `?${p.toString()}`;
}

export default function DemoApp() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('view') === 'simulator') return <Simulator />;
  if (params.get('view') === 'how-it-works') return <HowItWorks />;
  if (params.get('view') === 'components') return <Playground />;
  if (params.get('view') === 'hub9') return <Hub9View />;
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
          if (h.wantsBack()) h.action('back');
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
        frame
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

// The "9 games" hub exploration (prototype/hub9). Driven the same way as
// HubView, but Hub9 owns its own layout so it takes no phase/variation.
function Hub9View() {
  const hubRef = useRef<HubHandle>(null);
  const [launching, setLaunching] = useState<string | null>(null);

  const params = new URLSearchParams(window.location.search);
  // ?newRow=false hides the "New on Weekend" shelf (shown by default).
  const showNewRow = params.get('newRow') !== 'false';
  // ?detail= routes game selection through a full-screen game detail page instead
  // of launching straight into the game (the base hub9 behavior):
  //   page      — shot strip + the tile handed off from the shelf
  //   immersive — full-bleed preview art, logotype handed off from the top band
  const detailParam = params.get('detail');
  const detailView = detailParam === 'page' || detailParam === 'immersive' ? detailParam : 'sidebar';
  // ?subscribed=true starts signed in, so the detail page shows Play instead of
  // the pairing QR (hub9 has no top nav to sign in from).
  const subscribed = params.get('subscribed') === 'true';
  const content = showNewRow ? HUB9_CONTENT : { ...HUB9_CONTENT, shelves: [] };

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
          if (h.wantsBack()) h.action('back');
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
        content={content}
        detailView={detailView}
        initialSignedIn={subscribed}
        frame
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
    </>
  );
}

// The curated 9-game hub variations (their own layout, not a phase/variation).
interface Hub9Option {
  href: string;
  eyebrow: string;
  tagline: string;
  desc: string;
  flag?: string;
}

const HUB9_OPTIONS: Hub9Option[] = [
  {
    href: '?view=hub9',
    eyebrow: 'Curated 9-game hub',
    tagline: 'Hero + New Games + grid',
    flag: 'New',
    desc:
      'A tight nine-title catalog rendered through the same GameHub elements as the other variations. The hero carousel promotes the 7-day free trial plus Guess the Emoji, Werds and Wheel of Fortune, above a “New Games” shelf (Guess the Emoji & Werds tagged NEW) and an All Games grid. The focused game previews in the top area; OK launches it.',
  },
  {
    href: '?view=hub9&detail=page',
    eyebrow: 'Curated 9-game hub',
    tagline: '+ Game detail page',
    flag: 'New',
    desc:
      'The same hub, but selecting a game opens a full-screen game detail page instead of launching it — the current screenshot with a strip of every other shot beneath it, and the tile you picked handed off from the shelf into the slot above the title. ◀▶ in the strip swaps the big shot; Play / Add to Favorites sit on the right (the pairing QR replaces Play when you are signed out).',
  },
  {
    href: '?view=hub9&detail=immersive',
    eyebrow: 'Curated 9-game hub',
    tagline: '+ Immersive detail page',
    flag: 'New',
    desc:
      'A third take on the detail page: the preview art fills the screen, the content sits on a scrim along the bottom, and the game’s logotype flies down from the top preview band to stand in for the title. Actions run in a row beneath it. A couple of seconds in, the screenshots take the background over for three rounds and then hand it back to the art.',
  },
];

function Hub9Card() {
  return (
    <>
      <div
        style={{
          marginTop: 56,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#8a8a9a',
        }}
      >
        Prototypes — 9 games
      </div>
      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 377px))', justifyContent: 'start', gap: 24 }}>
        {HUB9_OPTIONS.map((o) => (
        <a
          key={o.href}
          href={o.href}
          style={{
            display: 'block',
            position: 'relative',
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
          {o.flag && (
            <div
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#0b0c0e',
                background: '#ffda0a',
                borderRadius: 999,
                padding: '5px 13px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
              }}
            >
              {o.flag}
            </div>
          )}
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', color: '#8a8a9a', textTransform: 'uppercase' }}>
            {o.eyebrow}
          </div>
          <div style={{ marginTop: 10, fontSize: 26, fontWeight: 800, letterSpacing: '-0.01em' }}>{o.tagline}</div>
          <p style={{ margin: '12px 0 0', fontSize: 15.5, lineHeight: 1.5, color: 'rgba(243,244,241,0.68)' }}>{o.desc}</p>
          <div style={{ marginTop: 18, fontSize: 15, fontWeight: 700, color: '#f3f4f1' }}>Open →</div>
        </a>
        ))}
      </div>
    </>
  );
}

function PrototypeGroup({ title, options }: { title: string; options: LayoutOption[] }) {
  if (options.length === 0) return null;
  return (
    <>
      <div
        style={{
          marginTop: 56,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#8a8a9a',
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 20,
          display: 'grid',
          // Cap columns at a 1/3-width slot so a lone tile doesn't stretch to
          // fill the row; the max matches (content − gaps) / 3.
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 377px))',
          justifyContent: 'start',
          gap: 24,
        }}
      >
        {options.map((o) => (
          <a
            key={`${o.phase}-${o.variation}`}
            href={optionHref(o)}
            style={{
              display: 'block',
              position: 'relative',
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
            {o.flag && (
              <div
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#04241a',
                  background: '#34d399', // vivid green — the chosen direction
                  borderRadius: 999,
                  padding: '5px 13px 5px 11px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                }}
              >
                <span aria-hidden style={{ fontSize: 13, lineHeight: 1 }}>✓</span>
                {o.flag}
              </div>
            )}
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', color: '#8a8a9a', textTransform: 'uppercase' }}>
              {o.name}
            </div>
            <div style={{ marginTop: 10, fontSize: 26, fontWeight: 800, letterSpacing: '-0.01em' }}>{o.tagline}</div>
            <p style={{ margin: '12px 0 0', fontSize: 15.5, lineHeight: 1.5, color: 'rgba(243,244,241,0.68)' }}>{o.desc}</p>
            <div style={{ marginTop: 18, fontSize: 15, fontWeight: 700, color: '#f3f4f1' }}>Open →</div>
          </a>
        ))}
      </div>
    </>
  );
}

function Gallery() {
  return (
    <div
      style={{
        // #root is locked to overflow:hidden/position:fixed for the TV stage, so
        // the gallery makes itself its own scroll region (scoped here — the TV
        // pages render GameHub, not Gallery, so they're unaffected).
        position: 'absolute',
        inset: 0,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
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

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 26 }}>
          <a
            href="?view=simulator"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '13px 22px',
              borderRadius: 999,
              textDecoration: 'none',
              fontSize: 15,
              fontWeight: 800,
              color: '#04241a',
              background: 'linear-gradient(90deg, #34d399, #22d3ee)',
              boxShadow: '0 6px 22px rgba(52,211,153,0.28)',
            }}
          >
            🎛️ Personalization Simulator →
          </a>
          <a
            href="?view=components"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '13px 20px',
              borderRadius: 999,
              textDecoration: 'none',
              fontSize: 15,
              fontWeight: 700,
              color: '#0b0c0e',
              background: '#e9eaec',
            }}
          >
            Component Kit →
          </a>
        </div>

        {/* User stories — the jobs these layouts are designed to serve. */}
        <section style={{ marginTop: 56 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#8a8a9a',
            }}
          >
            Designing for
          </div>
          <div
            style={{
              marginTop: 20,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 20,
            }}
          >
            {USER_STORIES.map((s, i) => (
              <div
                key={i}
                style={{
                  // Flat callout with a left accent rail — reads as reference
                  // content, distinct from the raised, clickable prototype cards.
                  background: 'rgba(255,255,255,0.02)',
                  borderLeft: '2px solid #6a6b70',
                  borderRadius: '0 12px 12px 0',
                  padding: '20px 24px',
                }}
              >
                <div
                  style={{
                    display: 'inline-block',
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#0b0c0e',
                    background: '#e9eaec',
                    borderRadius: 999,
                    padding: '4px 11px',
                  }}
                >
                  {s.role}
                </div>
                <p style={{ margin: '16px 0 0', fontSize: 17, lineHeight: 1.55, color: 'rgba(243,244,241,0.9)' }}>
                  As a {s.role}, I want to <b style={{ fontWeight: 700, color: '#f3f4f1' }}>{s.want}</b>, so that{' '}
                  {s.benefit}.
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Newest exploration: the curated 9-game hub. */}
        <Hub9Card />

        {/* Phase 0 prototypes first (smaller catalog), then phase 1. */}
        <PrototypeGroup title="Prototypes — 12–20 games" options={OPTIONS.filter((o) => o.phase === 0)} />
        <PrototypeGroup title="Prototypes — 30+ games" options={OPTIONS.filter((o) => o.phase === 1)} />

        <p style={{ marginTop: 44, fontSize: 14, color: '#6b6c71' }}>
          Tip: append <code style={{ color: '#b9babe' }}>&amp;pairing=true</code> to any layout to show the QR pairing panel.
          <br />
          On the 9-game hub, <code style={{ color: '#b9babe' }}>&amp;subscribed=true</code> starts you signed in — the game
          detail page then shows the <b>Play</b> button instead of the pairing QR.
          <br />
          Press <code style={{ color: '#b9babe' }}>S</code> anywhere on the 9-game hub to simulate a successful
          subscription — the “Welcome to Premium” modal reveals over the hub.
        </p>
      </div>
    </div>
  );
}

// ── Components playground ─────────────────────────────────────────────────────
// Usage tags describe the *job* each element does in the hub.
type UsageTag = 'merchandise' | 'navigation' | 'discovery' | 'personalization';

// Each usage tag gets its own hue so the jobs read apart at a glance. (The
// example stages stay B&W; these chips are documentation chrome.)
const TAG_COLORS: Record<UsageTag, string> = {
  merchandise: '#f4b740', // amber
  navigation: '#5aa9ff', // blue
  discovery: '#5ad19b', // green
  personalization: '#c58cf5', // purple
};

interface KitEntry {
  name: string;
  tags: UsageTag[];
  purpose: string;
  example: ReactNode;
}

const KIT_ENTRIES: KitEntry[] = [
  {
    name: 'Hero section',
    tags: ['merchandise'],
    purpose:
      'The top billboard. Rotates featured slides — a promoted game, editorial content, or a campaign (e.g. the free-trial offer). Oversized art, the game’s logotype, key metadata and one primary CTA. It’s the first thing on screen, so it sets the tone and drives the main action.',
    example: <HeroExample />,
  },
  {
    name: 'Regular game row',
    tags: ['navigation', 'personalization'],
    purpose:
      'The workhorse shelf: a horizontally-scrolling row of standard 16:9 tiles. Used for a category or genre, curated groupings, and personalized rows like Favorites or Jump Back On. This is the primary browse-and-select surface.',
    example: <SmallGameRow />,
  },
  {
    name: 'Large game row',
    tags: ['merchandise', 'navigation'],
    purpose:
      'A higher-impact shelf with oversized tiles. When a tile is highlighted it plays a looping screenshot slideshow to preview gameplay — used to spotlight promoted or editorially featured games (e.g. “Games That Go Viral”).',
    example: <LargeGameRow />,
  },
  {
    name: 'Banner',
    tags: ['merchandise'],
    purpose:
      'A full-width, single-focus panel carrying one message — a promoted campaign or content (e.g. the 7-day free trial with a QR to scan). One item, one action; it breaks up the shelves to elevate a promotion.',
    example: <PromoBanner />,
  },
  {
    name: 'Song Quiz inline banner',
    tags: ['merchandise', 'discovery'],
    purpose:
      'A full-width inline mini-game: a Song Quiz question the user can answer right from the hub — a title and auto-scrolling lyrics on the left, tappable answer options on the right. It turns a shelf slot into a playable teaser that advertises the game and leads into related titles once answered.',
    example: <SongQuizBanner />,
  },
  {
    name: 'Grid',
    tags: ['navigation', 'discovery'],
    purpose:
      'A multi-row grid (5 across) that shows many games at once. Best for exhaustive browse / scan-everything moments like the All Games page, where coverage matters more than curation.',
    example: <GameGridKit />,
  },
];

function Tag({ tag }: { tag: UsageTag }) {
  const c = TAG_COLORS[tag];
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        borderRadius: 999,
        padding: '4px 11px',
        color: c,
        background: `${c}22`, // ~13% tint
        border: `1px solid ${c}66`, // ~40% outline
      }}
    >
      {tag}
    </span>
  );
}

function Playground() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        background: 'radial-gradient(120% 90% at 50% -10%, #101114 0%, #08090a 60%)',
        color: '#f3f4f1',
        fontFamily: FONT,
        padding: '72px 6vw 120px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <a href="?" style={{ fontSize: 15, fontWeight: 700, color: '#8a8a9a', textDecoration: 'none' }}>
          ← Back to layouts
        </a>
        <h1 style={{ margin: '22px 0 0', fontSize: 52, fontWeight: 800, letterSpacing: '-0.03em', textWrap: 'balance' }}>
          Component kit — rows &amp; grids
        </h1>
        <p style={{ margin: '16px 0 0', fontSize: 20, lineHeight: 1.5, color: 'rgba(243,244,241,0.72)', maxWidth: 760 }}>
          The building blocks the hub is assembled from. Each element is tagged by the job it does —{' '}
          <b style={{ color: TAG_COLORS.merchandise }}>merchandise</b> vs <b style={{ color: TAG_COLORS.navigation }}>navigation</b>,
          plus <b style={{ color: TAG_COLORS.discovery }}>discovery</b> and{' '}
          <b style={{ color: TAG_COLORS.personalization }}>personalization</b> — with a live example rendered at hub fidelity.
        </p>

        <div style={{ marginTop: 56, display: 'flex', flexDirection: 'column', gap: 56 }}>
          {KIT_ENTRIES.map((e, i) => (
            <section key={e.name}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#6b6c71', fontVariantNumeric: 'tabular-nums' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h2 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em' }}>{e.name}</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  {e.tags.map((t) => (
                    <Tag key={t} tag={t} />
                  ))}
                </div>
              </div>
              <p style={{ margin: '14px 0 0', fontSize: 16.5, lineHeight: 1.6, color: 'rgba(243,244,241,0.78)', maxWidth: 860 }}>
                {e.purpose}
              </p>
              <div
                style={{
                  marginTop: 22,
                  borderRadius: 18,
                  border: '1px solid #26272b',
                  overflow: 'hidden',
                  background: '#0a0b0d',
                }}
              >
                {e.example}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
