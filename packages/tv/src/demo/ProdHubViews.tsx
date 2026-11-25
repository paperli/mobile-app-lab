// Demo routes for the production-hub replicas (prototype/hub-prod):
//   ?view=hub          — TV hub (1920×1080 stage, keyboard D-pad)
//   ?view=hub-desktop  — desktop web hub (responsive page, mouse/keyboard/touch)
// `&game=<id>` (from the funnel prototype) swaps the hero for that game's
// merch billboard alone, so a player lands on the game they picked;
// `&email=` starts the desktop hub signed in.
// Both render the prod layout snapshot. `?onboardingRow=false` drops the
// prototype-only "Get Started" row that launches the onboarding.
import { useState } from 'react';
import { ProdTvHub } from '../prototype/hub-prod/ProdTvHub';
import { ProdDesktopHub } from '../prototype/hub-prod/ProdDesktopHub';
import { TvStage } from '../prototype/hub-prod/Stage';
import { FONT, GAME_BY_ID, HUB_ROWS, ONBOARDING_ROW, type HeroItem, type ProdGame } from '../prototype/hub-prod/catalog';
import { assetUrl } from '../utils/assetUrl';
import { ONBOARDING_ID, onboardingUrl } from '../prototype/hub9/onboarding';

function useRows() {
  const params = new URLSearchParams(window.location.search);
  return params.get('onboardingRow') === 'false' ? HUB_ROWS : [...HUB_ROWS, ONBOARDING_ROW];
}

/** Merch billboard art per game, for the single-game hero (?game=). */
const MERCH_HERO: Record<string, { art: string; contentOffsetY: number }> = {
  jeopardy: { art: assetUrl('/games/hub9/merch/jeopardy.webp'), contentOffsetY: 45 },
  'wheel-of-fortune': { art: assetUrl('/games/hub9/merch/wheel-of-fortune.webp'), contentOffsetY: 30 },
  'song-quiz': { art: assetUrl('/games/hub9/merch/song-quiz.webp'), contentOffsetY: 45 },
  'spot-on': { art: assetUrl('/games/hub9/merch/spot-on.webp'), contentOffsetY: 45 },
  'emoji-multiplatform': { art: assetUrl('/games/hub9/merch/guess-the-emoji.webp'), contentOffsetY: 45 },
  'sketchy-af': { art: assetUrl('/games/hub9/merch/sketchy-af.webp'), contentOffsetY: 45 },
  'wits-end': { art: assetUrl('/games/hub9/merch/wits-end.webp'), contentOffsetY: 60 },
};

function useFocusedHero(): HeroItem[] | undefined {
  const id = new URLSearchParams(window.location.search).get('game');
  const game = id ? GAME_BY_ID.get(id) : undefined;
  const merch = id ? MERCH_HERO[id] : undefined;
  if (!game || !merch) return undefined;
  return [{ kind: 'billboard', key: `focus-${id}`, game, art: merch.art, ctaLabel: 'PLAY NOW', contentOffsetY: merch.contentOffsetY }];
}

function useLaunch() {
  const [launching, setLaunching] = useState<string | null>(null);
  const launch = (g: ProdGame) => {
    // The onboarding is a separate prototype, so it's a navigation.
    if (g.id === ONBOARDING_ID) {
      window.location.href = onboardingUrl();
      return;
    }
    setLaunching(g.title);
    window.setTimeout(() => setLaunching(null), 1400);
  };
  const overlay = launching && (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
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
  );
  return { launch, overlay, busy: launching !== null };
}

export function ProdHubView() {
  const rows = useRows();
  const heroItems = useFocusedHero();
  const { launch, overlay, busy } = useLaunch();
  return (
    <>
      <TvStage>
        <ProdTvHub rows={rows} heroItems={heroItems} onLaunch={launch} inputLocked={busy} onExit={() => (window.location.href = window.location.pathname)} />
      </TvStage>
      {overlay}
    </>
  );
}

export function ProdDesktopView() {
  const rows = useRows();
  const heroItems = useFocusedHero();
  const email = new URLSearchParams(window.location.search).get('email');
  const { launch, overlay } = useLaunch();
  return (
    <>
      <ProdDesktopHub rows={rows} heroItems={heroItems} onLaunch={launch} signedInEmail={email} />
      {overlay}
    </>
  );
}

const CARDS = [
  {
    href: '?view=hub',
    tagline: 'TV hub',
    desc: 'The shipped TV home: a merch hero (Wheel of Fortune billboard, then Shout Out and Free Time two-game carousels) over five rows of large tiles — Most Popular, New on Weekend, Party Starters, Family Favorites, Test Your Skills. Focusing a row shrinks the hero to the 480 preview band for the focused game. ◀▲▼▶ / Enter / Esc.',
  },
  {
    href: '?view=hub-desktop',
    tagline: 'Desktop hub',
    desc: 'The web version (prod ?layout=desktop): a fixed transparent top bar with sign-in, a full-bleed hero with hover arrows, and natively scrolling rows sized by container width. Hovering a tile for 250 ms opens a floating preview card with Play, Like and pills, and a click launches. Resize the window to see the rows reflow.',
  },
];

export function ProdHubCard() {
  return (
    <>
      <div style={{ marginTop: 56, fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8a8a9a' }}>
        Production hub — matches prod (Nov 2026)
      </div>
      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 377px))', justifyContent: 'start', gap: 24 }}>
        {CARDS.map((c) => (
          <a
            key={c.href}
            href={c.href}
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
              }}
            >
              Prod
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', color: '#8a8a9a', textTransform: 'uppercase' }}>Production hub</div>
            <div style={{ marginTop: 10, fontSize: 26, fontWeight: 800, letterSpacing: '-0.01em' }}>{c.tagline}</div>
            <p style={{ margin: '12px 0 0', fontSize: 15.5, lineHeight: 1.5, color: 'rgba(243,244,241,0.68)' }}>{c.desc}</p>
            <div style={{ marginTop: 18, fontSize: 15, fontWeight: 700, color: '#f3f4f1' }}>Open →</div>
          </a>
        ))}
      </div>
    </>
  );
}
