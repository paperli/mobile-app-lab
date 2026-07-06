// ─────────────────────────────────────────────────────────────────────────
//  Game Hub — extracted from the Figma "Multiplatform Hub" (node 18006-6408).
//
//  A TV home screen rendered in a fixed 1920×1080 design space that scales to
//  fit any viewport (so it always "fits 1080p" and letterboxes elsewhere).
//  Forced grayscale for exploratory B&W mockups. Three reusable, data-driven
//  pieces:
//     · Hero      — featured carousel: art + logo + description + pills + CTA + dots
//     · CategoryRow — header + horizontally scrolling tile track
//     · GameTile  — sm | lg; lg loops the game's screenshots as a slideshow on focus
//
//  Navigation is a roving D-pad focus over a vertical stack of sections
//  (hero → rows). App.tsx forwards remote/keyboard input via the imperative
//  handle, the same way it drives SystemMenuOverlay / PartyPlaylistSelect.
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { CSSProperties } from 'react';
import type { NavigationAction, NavigationDirection } from '@mobile-app-lab/shared';
import { QRCodeSVG } from 'qrcode.react';
import { HUB_GAMES, type HubGame } from '../prototype/hub/games';
import { GameArt } from '../prototype/hub/GameArt';
import { GameLogo } from '../prototype/hub/GameLogo';
import { GameMetaPills } from '../prototype/hub/MetadataPill';
import { Screenshot, SHOT_VARIANTS } from '../prototype/hub/Screenshot';
import { soundManager } from '../utils/sounds';
import { getMobileUrl } from '../utils/getMobileUrl';

// ── Design space ───────────────────────────────────────────────────────────
const STAGE_W = 1920;
const STAGE_H = 1080;
const FONT = "'Weekend Repro', ui-sans-serif, system-ui, sans-serif";
const INK = '#F3F4F1';
const INK_DIM = '#c9cacc';
const STAGE_BG = '#0a0b0d';

const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Content model — edit these to mock new categories ──────────────────────
type TileVariant = 'sm' | 'lg' | 'grid';
interface RowDef {
  key: string;
  title: string;
  sub?: string;
  variant: TileVariant;
  /** Loop the game's screenshots inside the tile while it's focused. */
  slideshow: boolean;
  games: HubGame[];
}

/** One navigable row below the hero (a shelf, a grid row, or the promo banner). */
interface NavRow {
  games: HubGame[];
  variant: TileVariant;
  slideshow: boolean;
  /** Single full-width focusable item (no tiles), e.g. the free-trial banner. */
  banner?: boolean;
}

// 20-game mockup catalog (a slice of the full themed dataset).
const HUB_CATALOG = HUB_GAMES.slice(0, 20);
const HERO_GAMES = HUB_CATALOG.slice(0, 3); // 3 featured slides → 3 dots

// "All Games" grid (variation 2): every game in the catalog, GRID_COLS per row.
const ALL_GAMES = HUB_CATALOG;
const GRID_COLS = 5;

function chunk<T>(arr: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const ROWS: RowDef[] = [
  { key: 'more', title: 'More Weekend Games', variant: 'sm', slideshow: false, games: HUB_CATALOG.slice(0, 7) },
  {
    key: 'community',
    title: 'Community Crafted Games',
    sub: 'Made by the Weekend developer community with our AI studio',
    variant: 'lg',
    slideshow: true,
    games: HUB_CATALOG.slice(7, 11),
  },
  { key: 'party', title: 'Party Starters', variant: 'sm', slideshow: false, games: HUB_CATALOG.slice(11, 16) },
  { key: 'brain', title: 'Brain Benders', variant: 'sm', slideshow: false, games: HUB_CATALOG.slice(16, 20) },
];

// Tile geometry per variant (design px). `grid` sizes so GRID_COLS fit one row.
const TILE = {
  sm: { w: 340, h: (340 * 9) / 16, r: 14, gap: 40, visible: 4 },
  lg: { w: 620, h: (620 * 9) / 16, r: 16, gap: 28, visible: 2 },
  grid: { w: 332, h: (332 * 9) / 16, r: 12, gap: 24, visible: GRID_COLS },
} as const;

const SHELF_PAD = 80;

// Height of the hero band, and (variation 3) the pinned top preview height.
const HERO_SECTION_H = 700;
const PREVIEW_H = 480;

// How long each hero slide stays before auto-advancing. The active dot fills
// over this same duration as a countdown.
const HERO_AUTOPLAY_MS = 6000;

// Hero slide-change choreography (see HeroSlide): outgoing art fades + slides
// left; incoming art/text fade in. Plus the active-dot countdown fill.
const HERO_ANIM_CSS = `
@keyframes hubHeroImgOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(-60px); } }
@keyframes hubHeroFadeOut { from { opacity: 1; } to { opacity: 0; } }
@keyframes hubHeroFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes hubHeroDotFill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
`;

// ── Imperative handle exposed to App.tsx ────────────────────────────────────
export interface HubHandle {
  navigate: (direction: NavigationDirection) => void;
  action: (action: NavigationAction) => void;
  /** Focus a game by id (voice "go to X"); optionally launch it. */
  focusGame: (id: string, autoLaunch?: boolean) => void;
  /** True while the game-info side panel is open (so Back closes it first). */
  isPanelOpen: () => boolean;
}

// Actions in the game-info side panel, top → bottom.
const PANEL_ACTIONS = ['play', 'favorite', 'lobby'] as const;

/** Hub prototype phases. 1 = the current Figma "Multiplatform Hub" build. */
export const HUB_PHASES = [1] as const;
/**
 * Hub layout variations.
 *   1 = base layout (all category shelves, no grid)
 *   2 = trimmed shelves + an "All Games" grid, OK opens the game-info panel
 *   3 = like 2, but the top area is a live preview of the focused game and OK
 *       launches directly (no panel)
 */
export const HUB_VARIATIONS = [1, 2, 3] as const;

interface GameHubProps {
  roomCode: string;
  /** Fired when the user presses OK on the hero CTA or a tile. */
  onLaunch: (game: HubGame) => void;
  /** Show the QR pairing panel. Off by default (hidden on the mockup). */
  showPairing?: boolean;
  /** Prototype phase (?phase=N). Falls back to 1 for unknown values. */
  phase?: number;
  /** Layout variation (?variation=N). Falls back to 1 for unknown values. */
  variation?: number;
}

interface NavState {
  sec: number; // 0 = hero, 1..N = rows
  col: number; // focused tile within the row
  heroSlide: number;
}

/** Scale a 1920×1080 stage to fill the viewport (letterbox on mismatch). */
function useFitScale() {
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const update = () =>
      setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return scale;
}

export const GameHub = forwardRef<HubHandle, GameHubProps>(function GameHub(
  { roomCode, onLaunch, showPairing = false, phase = 1, variation = 1 },
  ref
) {
  // Unknown values fall back to 1. Future phases/variations branch on these.
  const resolvedPhase = (HUB_PHASES as readonly number[]).includes(phase) ? phase : 1;
  const resolvedVariation = (HUB_VARIATIONS as readonly number[]).includes(variation) ? variation : 1;
  // Variation 3 keeps the large hero (section 0); the smaller top preview only
  // appears while a game tile below is focused, and OK launches directly.
  // Kept in a ref for the input callbacks.
  const isV3 = resolvedVariation === 3;
  const isV3Ref = useRef(isV3);
  isV3Ref.current = isV3;

  const scale = useFitScale();
  const [nav, setNav] = useState<NavState>({ sec: 0, col: 0, heroSlide: 0 });
  const [pressing, setPressing] = useState(false);
  const [shot, setShot] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  // Game-info side panel: which game (null = closed) + focused action index.
  const [panel, setPanel] = useState<{ game: HubGame | null; focus: number }>({ game: null, focus: 0 });
  const [panelShot, setPanelShot] = useState(0);
  const [favorites, setFavorites] = useState<ReadonlySet<string>>(() => new Set());

  const navRef = useRef(nav);
  navRef.current = nav;
  const panelRef = useRef(panel);
  panelRef.current = panel;
  const colMemoryRef = useRef<number[]>([]);
  const rowRefs = useRef<(HTMLElement | null)[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Ordered sections below the hero. Variations 2 & 3 drop the Party/Brain
  // shelves in favour of the All Games grid. A promo banner sits right below
  // Community Crafted Games. Both nav and render derive from this list, so
  // section index = list index + 1 (section 0 is the hero).
  const gridChunks = resolvedVariation >= 2 ? chunk(ALL_GAMES, GRID_COLS) : [];
  const visibleShelves =
    resolvedVariation >= 2 ? ROWS.filter((r) => r.key === 'more' || r.key === 'community') : ROWS;

  type SectionDef =
    | { kind: 'shelf'; row: RowDef }
    | { kind: 'banner' }
    | { kind: 'grid'; games: HubGame[]; gridIndex: number };
  const sections: SectionDef[] = [];
  visibleShelves.forEach((row) => {
    sections.push({ kind: 'shelf', row });
    if (row.key === 'community') sections.push({ kind: 'banner' });
  });
  gridChunks.forEach((games, gridIndex) => sections.push({ kind: 'grid', games, gridIndex }));

  const navRows: NavRow[] = sections.map((s) => {
    if (s.kind === 'shelf') return { games: s.row.games, variant: s.row.variant, slideshow: s.row.slideshow };
    if (s.kind === 'grid') return { games: s.games, variant: 'grid' as TileVariant, slideshow: false };
    return { games: [], variant: 'sm' as TileVariant, slideshow: false, banner: true };
  });
  const navRowsRef = useRef(navRows);
  navRowsRef.current = navRows;

  const launchGame = useCallback(
    (game: HubGame, autoDelay = 150) => {
      setPressing(true);
      setTimeout(() => setPressing(false), 150);
      soundManager.playSelectionSound();
      setTimeout(() => onLaunch(game), autoDelay);
    },
    [onLaunch]
  );

  const launch = useCallback(
    (autoDelay = 150) => {
      const cur = navRef.current;
      const game =
        cur.sec === 0 ? HERO_GAMES[cur.heroSlide] : navRowsRef.current[cur.sec - 1]?.games[cur.col];
      if (game) launchGame(game, autoDelay);
    },
    [launchGame]
  );

  const openPanel = useCallback((game: HubGame) => {
    const np = { game, focus: 0 };
    panelRef.current = np;
    setPanel(np);
    soundManager.playSelectionSound();
  }, []);

  const closePanel = useCallback(() => {
    if (!panelRef.current.game) return;
    const np = { game: null, focus: 0 };
    panelRef.current = np;
    setPanel(np);
    soundManager.playNavigationSound();
  }, []);

  // Move focus to a section (used by the banner, which has no launch action).
  const focusSection = useCallback((sectionIndex: number, col = 0) => {
    colMemoryRef.current[sectionIndex] = col;
    const n = { ...navRef.current, sec: sectionIndex, col };
    navRef.current = n;
    setNav(n);
    soundManager.playNavigationSound();
  }, []);

  // Click/focus a tile. Variation 3 launches directly; others open the panel.
  const selectTile = useCallback(
    (sectionIndex: number, i: number, game: HubGame) => {
      colMemoryRef.current[sectionIndex] = i;
      const n = { ...navRef.current, sec: sectionIndex, col: i };
      navRef.current = n;
      setNav(n);
      if (isV3Ref.current) launchGame(game);
      else openPanel(game);
    },
    [launchGame, openPanel]
  );

  const toggleFavorite = useCallback((id: string) => {
    soundManager.playSelectionSound();
    setFavorites((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const move = useCallback((dx: number, dy: number) => {
    // While the panel is open, ▲▼ move between its actions.
    const p = panelRef.current;
    if (p.game) {
      if (dy !== 0) {
        const nf = Math.min(Math.max(0, p.focus + (dy > 0 ? 1 : -1)), PANEL_ACTIONS.length - 1);
        if (nf !== p.focus) {
          const np = { ...p, focus: nf };
          panelRef.current = np;
          setPanel(np);
          soundManager.playNavigationSound();
        } else {
          soundManager.playBounceSound();
        }
      } else {
        soundManager.playBounceSound();
      }
      return;
    }

    const prev = navRef.current;
    let next = prev;
    let sound: 'nav' | 'bounce' | null = null;

    const rows = navRowsRef.current;
    const sectionCount = rows.length + 1;
    if (dx !== 0) {
      if (prev.sec === 0) {
        const hs = (prev.heroSlide + (dx > 0 ? 1 : -1) + HERO_GAMES.length) % HERO_GAMES.length;
        next = { ...prev, heroSlide: hs };
        sound = 'nav';
      } else if (rows[prev.sec - 1]?.banner) {
        sound = 'bounce'; // banner is a single full-width item
      } else {
        const items = rows[prev.sec - 1]?.games ?? [];
        const nc = prev.col + (dx > 0 ? 1 : -1);
        if (nc < 0 || nc >= items.length) sound = 'bounce';
        else {
          colMemoryRef.current[prev.sec] = nc;
          next = { ...prev, col: nc };
          sound = 'nav';
        }
      }
    } else if (dy !== 0) {
      const ns = prev.sec + (dy > 0 ? 1 : -1);
      if (ns < 0 || ns >= sectionCount) sound = 'bounce';
      else {
        const targetRow = rows[ns - 1];
        // Keep the current column when moving vertically so focus lands on the
        // closest item in the next row (rather than jumping back to the first).
        const col =
          ns === 0 || targetRow?.banner
            ? 0
            : Math.max(0, Math.min(prev.col, (targetRow?.games.length ?? 1) - 1));
        colMemoryRef.current[ns] = col;
        next = { ...prev, sec: ns, col };
        sound = 'nav';
      }
    }

    if (sound === 'nav') soundManager.playNavigationSound();
    else if (sound === 'bounce') soundManager.playBounceSound();
    if (next !== prev) {
      navRef.current = next;
      setNav(next);
    }
  }, []);

  const navigate = useCallback(
    (direction: NavigationDirection) => {
      if (direction === 'left') move(-1, 0);
      else if (direction === 'right') move(1, 0);
      else if (direction === 'up') move(0, -1);
      else if (direction === 'down') move(0, 1);
    },
    [move]
  );

  const focusGame = useCallback(
    (id: string, autoLaunch?: boolean) => {
      const rows = navRowsRef.current;
      for (let r = 0; r < rows.length; r++) {
        const idx = rows[r].games.findIndex((g) => g.id === id);
        if (idx >= 0) {
          colMemoryRef.current[r + 1] = idx;
          const next = { ...navRef.current, sec: r + 1, col: idx };
          navRef.current = next;
          setNav(next);
          soundManager.playNavigationSound();
          if (autoLaunch) setTimeout(() => launch(250), 300);
          return;
        }
      }
      const hIdx = HERO_GAMES.findIndex((g) => g.id === id);
      if (hIdx >= 0) {
        const next = { ...navRef.current, sec: 0, heroSlide: hIdx };
        navRef.current = next;
        setNav(next);
        soundManager.playNavigationSound();
        if (autoLaunch) setTimeout(() => launch(250), 300);
      }
    },
    [launch]
  );

  const doAction = useCallback(
    (action: NavigationAction) => {
      const p = panelRef.current;
      if (p.game) {
        if (action === 'back') {
          closePanel();
          return;
        }
        if (action === 'ok') {
          const which = PANEL_ACTIONS[p.focus];
          if (which === 'play') {
            const g = p.game;
            closePanel();
            launchGame(g);
          } else if (which === 'favorite') {
            toggleFavorite(p.game.id);
          } else {
            closePanel();
          }
        }
        return;
      }
      // Panel closed: OK on the hero plays now; OK on a tile opens its panel.
      if (action === 'ok') {
        const cur = navRef.current;
        if (cur.sec === 0) {
          launch(); // hero CTA (all variations)
        } else if (isV3Ref.current) {
          // Variation 3: launch the focused game tile directly (no panel).
          const g = navRowsRef.current[cur.sec - 1]?.games[cur.col];
          if (g) launchGame(g);
        } else {
          const g = navRowsRef.current[cur.sec - 1]?.games[cur.col];
          if (g) openPanel(g);
        }
      }
    },
    [closePanel, launchGame, toggleFavorite, launch, openPanel]
  );

  useImperativeHandle(
    ref,
    () => ({
      navigate,
      action: doAction,
      focusGame,
      isPanelOpen: () => panelRef.current.game !== null,
    }),
    [navigate, doAction, focusGame]
  );

  // Hero auto-advance while the hero is focused. A per-slide timeout (rather
  // than a fixed interval) so manual navigation resets the clock and the
  // active-dot countdown stays in sync.
  useEffect(() => {
    if (nav.sec !== 0 || reduceMotion || panel.game) return;
    const t = setTimeout(() => {
      setNav((p) => {
        const n = { ...p, heroSlide: (p.heroSlide + 1) % HERO_GAMES.length };
        navRef.current = n;
        return n;
      });
    }, HERO_AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [nav.sec, nav.heroSlide, panel.game]);

  // Slideshow: loop screenshots inside a focused tile on a slideshow row.
  useEffect(() => {
    setShot(0);
    if (nav.sec === 0 || reduceMotion) return;
    if (!navRowsRef.current[nav.sec - 1]?.slideshow) return;
    const t = setInterval(() => setShot((s) => (s + 1) % SHOT_VARIANTS.length), 1500);
    return () => clearInterval(t);
  }, [nav.sec, nav.col]);

  // Slideshow inside the open game-info panel.
  useEffect(() => {
    setPanelShot(0);
    if (!panel.game || reduceMotion) return;
    const t = setInterval(() => setPanelShot((s) => (s + 1) % SHOT_VARIANTS.length), 1800);
    return () => clearInterval(t);
  }, [panel.game]);

  // Vertical scroll so the focused row is comfortably in view.
  useLayoutEffect(() => {
    if (nav.sec === 0) {
      setScrollY(0);
      return;
    }
    const el = rowRefs.current[nav.sec - 1];
    const sc = scrollerRef.current;
    if (!el || !sc) return;
    const max = Math.max(0, sc.offsetHeight - STAGE_H);
    // v3 parks the focused row flush below the opaque preview overlay (so no
    // hero peeks through); other variations leave headroom above the row.
    const target = isV3 ? el.offsetTop - PREVIEW_H : el.offsetTop - 120;
    setScrollY(Math.min(Math.max(0, target), max));
  }, [nav.sec, isV3]);

  // Hero slide transition: on a slide change, keep the previous slide mounted
  // briefly as the "outgoing" layer so it can fade + slide left while the new
  // one fades in.
  const [heroTransFrom, setHeroTransFrom] = useState<number | null>(null);
  const prevHeroSlideRef = useRef(nav.heroSlide);
  useEffect(() => {
    if (prevHeroSlideRef.current === nav.heroSlide) return;
    const from = prevHeroSlideRef.current;
    prevHeroSlideRef.current = nav.heroSlide;
    if (reduceMotion) return;
    setHeroTransFrom(from);
    const t = setTimeout(() => setHeroTransFrom(null), 640);
    return () => clearTimeout(t);
  }, [nav.heroSlide]);

  const handleHeroPlay = useCallback(() => {
    const n = { ...navRef.current, sec: 0 };
    navRef.current = n;
    setNav(n);
    launch();
  }, [launch]);

  const mobileUrl = `${getMobileUrl()}?code=${roomCode}`;
  const heroGame = HERO_GAMES[nav.heroSlide];

  // Keep rendering the last game while the panel slides out (panel.game → null).
  const lastPanelGameRef = useRef<HubGame | null>(null);
  if (panel.game) lastPanelGameRef.current = panel.game;
  const panelGame = panel.game ?? lastPanelGameRef.current;

  // Variation 3: while a game tile is focused (sec ≥ 1) the top area previews
  // that game; on the hero (sec 0) the large hero shows instead.
  const previewGame = isV3 && nav.sec >= 1 ? navRows[nav.sec - 1]?.games[nav.col] ?? null : null;
  const showPreview = isV3 && previewGame !== null;

  // Shared rows (shelves, promo banner, All Games grid), used by every variation.
  const rowsContent = (
    <>
      {sections.map((s, si) => {
        const sectionIndex = si + 1;
        const focusedHere = nav.sec === sectionIndex;

        // ── Free-trial promo banner (single full-width focusable item) ──
        if (s.kind === 'banner') {
          return (
            <div
              key="promo-banner"
              ref={(el) => (rowRefs.current[sectionIndex - 1] = el)}
              style={{ padding: `0 ${SHELF_PAD}px`, marginTop: 44 }}
            >
              <button
                onClick={() => focusSection(sectionIndex, 0)}
                style={{
                  appearance: 'none',
                  width: '100%',
                  height: 220,
                  borderRadius: 20,
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 56px',
                  gap: 40,
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: INK,
                  fontFamily: FONT,
                  background: 'linear-gradient(100deg, #17181c 0%, #26272d 58%, #35363d 100%)',
                  border: '1px solid #3a3b3f',
                  transform: focusedHere ? (pressing ? 'scale(0.995)' : 'scale(1.008)') : 'scale(1)',
                  boxShadow: focusedHere ? '0 0 0 4px #fff, 0 24px 60px rgba(0,0,0,0.6)' : 'none',
                  transition: 'transform 240ms cubic-bezier(.22,.61,.36,1), box-shadow 240ms ease',
                  zIndex: focusedHere ? 3 : 1,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 1100 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.14em', color: '#b9babe' }}>
                    WEEKEND PREMIUM
                  </span>
                  <span style={{ fontSize: 46, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
                    Start your 7-day free trial
                  </span>
                  <span style={{ fontSize: 22, color: 'rgba(243,244,241,0.72)' }}>
                    Unlimited access to every game. Cancel anytime.
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 22, flex: '0 0 auto' }}>
                  <span style={{ fontSize: 18, fontWeight: 600, color: '#cfd0d3' }}>Scan to start →</span>
                  <div style={{ background: '#fff', padding: 12, borderRadius: 14, lineHeight: 0 }}>
                    <QRCodeSVG value="https://weekend.tv/free-trial" size={124} level="M" includeMargin={false} />
                  </div>
                </div>
              </button>
            </div>
          );
        }

        // ── All Games grid row ──
        if (s.kind === 'grid') {
          const t = TILE.grid;
          const col = focusedHere ? nav.col : Math.min(colMemoryRef.current[sectionIndex] ?? 0, s.games.length - 1);
          return (
            <div key={`all-games-${s.gridIndex}`}>
              {s.gridIndex === 0 && (
                <div style={{ padding: `0 ${SHELF_PAD}px`, margin: '44px 0 22px' }}>
                  <h2 style={{ margin: 0, fontSize: 32, fontWeight: 700, letterSpacing: '-0.01em', color: INK }}>
                    All Games
                  </h2>
                </div>
              )}
              <div
                ref={(el) => (rowRefs.current[sectionIndex - 1] = el)}
                style={{ display: 'flex', gap: t.gap, padding: `0 ${SHELF_PAD}px`, marginTop: s.gridIndex === 0 ? 0 : t.gap }}
              >
                {s.games.map((game, i) => (
                  <Tile
                    key={game.id}
                    game={game}
                    variant="grid"
                    focused={focusedHere && i === col}
                    pressing={pressing && focusedHere && i === col}
                    slideshow={false}
                    shot={shot}
                    onClick={() => selectTile(sectionIndex, i, s.games[i])}
                  />
                ))}
              </div>
            </div>
          );
        }

        // ── Category shelf ──
        const row = s.row;
        const t = TILE[row.variant];
        const col = focusedHere ? nav.col : Math.min(colMemoryRef.current[sectionIndex] ?? 0, row.games.length - 1);
        const step = t.w + t.gap;
        const trackX = -Math.max(0, col - (t.visible - 1)) * step;
        return (
          <section
            key={row.key}
            ref={(el) => (rowRefs.current[sectionIndex - 1] = el)}
            style={{ marginTop: si === 0 ? 8 : 36, paddingBottom: 12 }}
          >
            <div style={{ padding: `0 ${SHELF_PAD}px`, marginBottom: 22 }}>
              <h2 style={{ margin: 0, fontSize: 32, fontWeight: 700, letterSpacing: '-0.01em', color: INK }}>{row.title}</h2>
              {row.sub && <p style={{ margin: '10px 0 0', fontSize: 21, color: '#8a8a9a' }}>{row.sub}</p>}
            </div>
            <div
              style={{
                display: 'flex',
                gap: t.gap,
                paddingLeft: SHELF_PAD,
                transform: `translateX(${trackX}px)`,
                transition: 'transform 420ms cubic-bezier(.22,.61,.36,1)',
              }}
            >
              {row.games.map((game, i) => (
                <Tile
                  key={game.id}
                  game={game}
                  variant={row.variant}
                  focused={focusedHere && i === col}
                  pressing={pressing && focusedHere && i === col}
                  slideshow={row.slideshow}
                  shot={shot}
                  onClick={() => selectTile(sectionIndex, i, row.games[i])}
                />
              ))}
            </div>
          </section>
        );
      })}

      <div style={{ height: 100 }} />
    </>
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: '#000',
        overflow: 'hidden',
      }}
    >
      <div
        data-hub-phase={resolvedPhase}
        data-hub-variation={resolvedVariation}
        style={{
          width: STAGE_W,
          height: STAGE_H,
          position: 'relative',
          overflow: 'hidden',
          background: STAGE_BG,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          filter: 'grayscale(1) contrast(1.03)', // B&W guarantee
          fontFamily: FONT,
        }}
      >
        <style>{HERO_ANIM_CSS}</style>
        {/* Vertically-scrolling content */}
        <div
          ref={scrollerRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: STAGE_W,
            transform: `translateY(${-scrollY}px)`,
            transition: 'transform 460ms cubic-bezier(.22,.61,.36,1)',
          }}
        >
          {/* ── Hero ─────────────────────────────────────────────── */}
          <section style={{ position: 'relative', height: HERO_SECTION_H }}>
            {/* Incoming / current slide (outgoing is rendered after, so it
                sits on top and is visibly the one leaving). */}
            <HeroSlide
              key={`hero-in-${nav.heroSlide}`}
              game={heroGame}
              phase={heroTransFrom !== null ? 'in' : 'idle'}
              heroFocused={nav.sec === 0}
              pressing={pressing}
              onPlay={handleHeroPlay}
            />
            {heroTransFrom !== null && (
              <HeroSlide
                key={`hero-out-${heroTransFrom}`}
                game={HERO_GAMES[heroTransFrom]}
                phase="out"
                heroFocused={nav.sec === 0}
                pressing={false}
                onPlay={handleHeroPlay}
              />
            )}

            {/* Persistent chrome (stays put across slide changes) */}
            <div
              style={{
                position: 'absolute',
                left: SHELF_PAD,
                top: 44,
                fontFamily: FONT,
                fontWeight: 800,
                fontSize: 44,
                letterSpacing: '-0.02em',
                color: INK,
                textShadow: '0 2px 20px rgba(0,0,0,0.6)',
              }}
            >
              weekend
            </div>

            {/* Pairing panel — hidden by default; enable with ?pairing=true */}
            {showPairing && (
              <div
                style={{
                  position: 'absolute',
                  top: 36,
                  right: 60,
                  background: 'rgba(0,0,0,0.55)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: 20,
                  border: '1px solid rgba(255,255,255,0.12)',
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  color: INK,
                }}
              >
                <div style={{ background: '#fff', padding: 8, borderRadius: 10, lineHeight: 0 }}>
                  <QRCodeSVG value={mobileUrl} size={124} level="M" includeMargin={false} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#b9babe', letterSpacing: '0.06em' }}>
                    PAIRING CODE
                  </div>
                  <div
                    style={{ fontSize: 44, fontWeight: 800, letterSpacing: '0.12em', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {roomCode || 'LOADING'}
                  </div>
                  <div style={{ fontSize: 14, color: '#8a8a9a', marginTop: 4, maxWidth: 200 }}>
                    Scan or enter the code on your phone
                  </div>
                </div>
              </div>
            )}

            {/* Carousel dots — the active one fills as a countdown to the
                next auto-advance (static full when the hero isn't focused). */}
            <div
              style={{
                position: 'absolute',
                bottom: 44,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: 12,
                alignItems: 'center',
              }}
            >
              {HERO_GAMES.map((g, i) => {
                const active = i === nav.heroSlide;
                const countdown = active && nav.sec === 0 && !reduceMotion && !panel.game;
                return (
                  <span
                    key={g.id}
                    style={{
                      position: 'relative',
                      width: active ? 36 : 12,
                      height: 12,
                      borderRadius: 9999,
                      overflow: 'hidden',
                      background: active ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.3)',
                      transition: 'width 300ms ease, background 300ms ease',
                    }}
                  >
                    {active && (
                      <span
                        // Remount on each slide (and on refocus) so the fill
                        // restarts in lockstep with the auto-advance timeout.
                        key={`fill-${nav.heroSlide}-${nav.sec === 0}`}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: 9999,
                          background: INK,
                          transformOrigin: 'left center',
                          ...(countdown
                            ? { animation: `hubHeroDotFill ${HERO_AUTOPLAY_MS}ms linear forwards` }
                            : { transform: 'scaleX(1)' }),
                        }}
                      />
                    )}
                  </span>
                );
              })}
            </div>
          </section>

          {rowsContent}
        </div>

        {/* ── Game info side panel ───────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: panel.game ? 'auto' : 'none',
          }}
        >
          {/* Dim the hub behind; click to dismiss. */}
          <div
            onClick={closePanel}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.62)',
              opacity: panel.game ? 1 : 0,
              transition: 'opacity 300ms ease',
            }}
          />
          <aside
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              height: STAGE_H,
              width: 640,
              background: '#0d0e10',
              borderLeft: '1px solid #26272b',
              boxShadow: '-30px 0 80px rgba(0,0,0,0.6)',
              transform: panel.game ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 360ms cubic-bezier(.22,.61,.36,1)',
              display: 'flex',
              flexDirection: 'column',
              padding: '46px 44px',
              gap: 26,
              color: INK,
            }}
          >
            {panelGame && (
              <>
                {/* Screenshots slideshow */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '16 / 9',
                    borderRadius: 14,
                    overflow: 'hidden',
                    flex: '0 0 auto',
                    background: '#141518',
                  }}
                >
                  {SHOT_VARIANTS.map((v, i) => (
                    <Screenshot
                      key={v}
                      game={panelGame}
                      variant={v}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: i === panelShot ? 1 : 0,
                        transition: 'opacity 700ms ease',
                      }}
                    />
                  ))}
                </div>

                {/* Title + meta + description */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <span
                    style={{
                      fontFamily: FONT,
                      fontWeight: 800,
                      fontSize: 44,
                      letterSpacing: '-0.02em',
                      lineHeight: 1.05,
                    }}
                  >
                    {panelGame.title}
                  </span>
                  <GameMetaPills players={panelGame.players} interaction={panelGame.interaction} size={36} />
                  <p style={{ margin: 0, fontSize: 20, lineHeight: 1.4, color: 'rgba(243,244,241,0.72)' }}>
                    {panelGame.description}
                  </p>
                </div>

                {/* Actions */}
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <PanelButton
                    label="Play"
                    focused={panel.focus === 0}
                    pressing={pressing && panel.focus === 0}
                    onClick={() => {
                      const g = panelRef.current.game ?? panelGame;
                      closePanel();
                      launchGame(g);
                    }}
                  />
                  <PanelButton
                    label={favorites.has(panelGame.id) ? '♥  Favorited' : '♡  Add to Favorites'}
                    focused={panel.focus === 1}
                    onClick={() => toggleFavorite(panelGame.id)}
                  />
                  <PanelButton label="Back to Lobby" focused={panel.focus === 2} onClick={closePanel} />
                </div>
              </>
            )}
          </aside>
        </div>

        {/* Variation 3: pinned preview overlay while a game tile is focused. */}
        {isV3 && showPreview && previewGame && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: STAGE_W, height: PREVIEW_H, zIndex: 4 }}>
            <PreviewHero game={previewGame} showPairing={showPairing} roomCode={roomCode} mobileUrl={mobileUrl} />
          </div>
        )}
      </div>
    </div>
  );
});

// ── Game-info panel action button ────────────────────────────────────────────
function PanelButton({
  label,
  focused,
  pressing,
  onClick,
}: {
  label: string;
  focused: boolean;
  pressing?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        appearance: 'none',
        width: '100%',
        height: 60,
        borderRadius: 12,
        cursor: 'pointer',
        fontFamily: FONT,
        fontSize: 20,
        fontWeight: 700,
        letterSpacing: '0.01em',
        transition:
          'transform 200ms cubic-bezier(.22,.61,.36,1), background 200ms ease, box-shadow 200ms ease, color 200ms ease, border-color 200ms ease',
        ...(focused
          ? {
              background: INK,
              color: '#000',
              border: '1px solid #fff',
              transform: pressing ? 'scale(0.98)' : 'scale(1.02)',
              boxShadow: '0 0 0 3px #fff, 0 12px 30px rgba(0,0,0,0.55)',
            }
          : {
              background: '#1c1d21',
              color: INK,
              border: '1px solid #3a3b3f',
              transform: 'scale(1)',
              boxShadow: 'none',
            }),
      }}
    >
      {label}
    </button>
  );
}

// ── Preview hero (variation 3) ───────────────────────────────────────────────
// A pinned top band that mirrors the hero styling but reflects the focused
// game (no CTA, no carousel). Re-keyed by game id so it cross-fades on focus.
interface PreviewHeroProps {
  game: HubGame;
  showPairing: boolean;
  roomCode: string;
  mobileUrl: string;
}

function PreviewHero({ game, showPairing, roomCode, mobileUrl }: PreviewHeroProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: STAGE_W,
        height: PREVIEW_H,
        overflow: 'hidden',
        background: STAGE_BG, // opaque so the large hero never shows through
      }}
    >
      {/* Art + fades. Swaps opaquely in place (no fade) so the hero behind the
          overlay is never briefly revealed when switching games. */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <GameArt
          game={game}
          variant="hero"
          style={{ position: 'absolute', top: 0, left: 0, width: STAGE_W, height: PREVIEW_H }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(to right, ${STAGE_BG} 0%, ${STAGE_BG} 24%, transparent 56%)`,
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 200,
            background: `linear-gradient(to top, ${STAGE_BG} 0%, transparent 100%)`,
          }}
        />
      </div>

      {/* Weekend wordmark */}
      <div
        style={{
          position: 'absolute',
          left: SHELF_PAD,
          top: 44,
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 44,
          letterSpacing: '-0.02em',
          color: INK,
          textShadow: '0 2px 20px rgba(0,0,0,0.6)',
        }}
      >
        weekend
      </div>

      {/* Pairing panel — hidden by default; enable with ?pairing=true */}
      {showPairing && (
        <div
          style={{
            position: 'absolute',
            top: 36,
            right: 60,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.12)',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            color: INK,
          }}
        >
          <div style={{ background: '#fff', padding: 7, borderRadius: 10, lineHeight: 0 }}>
            <QRCodeSVG value={mobileUrl} size={96} level="M" includeMargin={false} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#b9babe', letterSpacing: '0.06em' }}>PAIRING CODE</div>
            <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '0.12em', fontVariantNumeric: 'tabular-nums' }}>
              {roomCode || 'LOADING'}
            </div>
          </div>
        </div>
      )}

      {/* Focused game info (swaps in place) */}
      <div
        style={{
          position: 'absolute',
          left: SHELF_PAD,
          top: 150,
          width: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 22,
        }}
      >
        <div style={{ maxWidth: 760 }}>
          <GameLogo title={game.title} theme={game.theme} style={{ fontSize: 80, whiteSpace: 'normal' }} />
        </div>
        <p
          style={{
            margin: 0,
            maxWidth: 620,
            fontSize: 24,
            lineHeight: 1.35,
            color: 'rgba(243,244,241,0.82)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {game.description}
        </p>
        <GameMetaPills players={game.players} interaction={game.interaction} size={40} />
      </div>
    </div>
  );
}

// ── Hero slide ───────────────────────────────────────────────────────────────
type HeroPhase = 'idle' | 'in' | 'out';

interface HeroSlideProps {
  game: HubGame;
  phase: HeroPhase;
  /** Whether the hero section currently holds D-pad focus. */
  heroFocused: boolean;
  pressing: boolean;
  onPlay: () => void;
}

function HeroSlide({ game, phase, heroFocused, pressing, onPlay }: HeroSlideProps) {
  // The CTA re-selects (unselected → selected) as the new slide settles, so the
  // change reads clearly. Incoming slides start unselected then flip; otherwise
  // the button just mirrors whether the hero is focused.
  const [selected, setSelected] = useState(phase !== 'in' && heroFocused);
  useEffect(() => {
    if (!heroFocused) {
      setSelected(false);
      return;
    }
    if (phase === 'in') {
      setSelected(false);
      const t = setTimeout(() => setSelected(true), 320);
      return () => clearTimeout(t);
    }
    setSelected(true);
  }, [phase, heroFocused]);

  const artAnim =
    phase === 'out'
      ? 'hubHeroImgOut 400ms cubic-bezier(.4,0,.2,1) forwards'
      : phase === 'in'
        ? 'hubHeroFadeIn 460ms ease 80ms both'
        : undefined;
  const contentAnim =
    phase === 'out'
      ? 'hubHeroFadeOut 240ms ease forwards'
      : phase === 'in'
        ? 'hubHeroFadeIn 440ms ease 160ms both'
        : undefined;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: STAGE_W,
        height: 700,
        pointerEvents: phase === 'out' ? 'none' : undefined,
      }}
    >
      {/* Art + fades (this is what slides left on the way out) */}
      <div style={{ position: 'absolute', inset: 0, animation: artAnim }}>
        <GameArt
          game={game}
          variant="hero"
          style={{ position: 'absolute', top: 0, left: 0, width: STAGE_W, height: 620 }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(to right, ${STAGE_BG} 0%, ${STAGE_BG} 24%, transparent 56%)`,
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: 620,
            background: `linear-gradient(to top, ${STAGE_BG} 2%, transparent 46%)`,
          }}
        />
      </div>

      {/* Text column (fades only) */}
      <div
        style={{
          position: 'absolute',
          left: SHELF_PAD,
          bottom: 150,
          width: 820,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 26,
          animation: contentAnim,
        }}
      >
        <div style={{ maxWidth: 640 }}>
          <GameLogo title={game.title} theme={game.theme} style={{ fontSize: 92, whiteSpace: 'normal' }} />
        </div>
        <p
          style={{
            margin: 0,
            maxWidth: 620,
            fontSize: 26,
            lineHeight: 1.35,
            color: 'rgba(243,244,241,0.82)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {game.description}
        </p>
        <GameMetaPills players={game.players} interaction={game.interaction} size={42} />
        <button
          onClick={onPlay}
          style={{
            appearance: 'none',
            marginTop: 6,
            minWidth: 220,
            height: 56,
            padding: '0 34px',
            borderRadius: 9999,
            cursor: 'pointer',
            fontFamily: FONT,
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: '0.02em',
            transition:
              'transform 220ms cubic-bezier(.22,.61,.36,1), background 220ms ease, box-shadow 220ms ease, color 220ms ease, border-color 220ms ease',
            ...(selected
              ? {
                  background: INK,
                  color: '#000',
                  border: '1px solid #fff',
                  transform: pressing ? 'scale(0.96)' : 'scale(1.04)',
                  boxShadow: '0 0 0 4px #fff, 0 12px 30px rgba(0,0,0,0.6)',
                }
              : {
                  background: '#141518',
                  color: INK,
                  border: '1px solid #3a3b3f',
                  transform: 'scale(1)',
                  boxShadow: 'none',
                }),
          }}
        >
          PLAY NOW
        </button>
      </div>
    </div>
  );
}

// ── GameTile ────────────────────────────────────────────────────────────────
interface TileProps {
  game: HubGame;
  variant: TileVariant;
  focused: boolean;
  pressing: boolean;
  slideshow: boolean;
  shot: number;
  onClick: () => void;
}

function Tile({ game, variant, focused, pressing, slideshow, shot, onClick }: TileProps) {
  const t = TILE[variant];
  const showShots = slideshow && focused;

  const captionStyle: CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: variant === 'lg' ? 22 : variant === 'grid' ? 14 : 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  };

  return (
    <button
      onClick={onClick}
      style={{
        appearance: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        position: 'relative',
        flex: '0 0 auto',
        width: t.w,
        height: t.h,
        borderRadius: t.r,
        overflow: 'hidden',
        background: '#141518',
        transform: focused ? (pressing ? 'scale(0.98)' : 'scale(1.06)') : 'scale(1)',
        transition: 'transform 240ms cubic-bezier(.22,.61,.36,1), box-shadow 240ms ease',
        boxShadow: focused ? '0 0 0 4px #fff, 0 26px 60px rgba(0,0,0,0.7)' : 'none',
        zIndex: focused ? 3 : 1,
      }}
    >
      {/* Base tile art with the game name centered as the logotype */}
      <GameArt
        game={game}
        variant="tile"
        hideMotif
        style={{
          position: 'absolute',
          inset: 0,
          opacity: showShots ? 0 : 1,
          transition: 'opacity 500ms ease',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 10%',
          }}
        >
          <GameLogo
            title={game.title}
            theme={game.theme}
            style={{
              fontSize: variant === 'lg' ? '15cqh' : '18cqh',
              maxWidth: '86%',
              whiteSpace: 'normal',
              textAlign: 'center',
              lineHeight: 1,
            }}
          />
        </div>
      </GameArt>

      {/* Slideshow screenshots (loop while focused) */}
      {slideshow &&
        SHOT_VARIANTS.map((v, i) => (
          <Screenshot
            key={v}
            game={game}
            variant={v}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: showShots && i === shot ? 1 : 0,
              transition: 'opacity 700ms ease',
            }}
          />
        ))}

      {/* Legibility scrim */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(0deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0) 55%)',
        }}
      />

      {/* Caption — metadata only; the game name now lives centered on the art */}
      <div style={captionStyle}>
        <span style={{ display: 'flex', gap: 10, alignItems: 'center', color: INK_DIM, fontSize: variant === 'lg' ? 20 : variant === 'grid' ? 14 : 15 }}>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{game.players}</span>
          {variant === 'lg' && <span style={{ color: '#8a8a9a' }}>• {game.description}</span>}
        </span>
      </div>

      {/* PLAYING chip while the slideshow loops */}
      {showShots && (
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '5px 10px',
            borderRadius: 9999,
            background: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(255,255,255,0.28)',
            fontFamily: FONT,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: INK,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />
          PLAYING
        </div>
      )}
    </button>
  );
}
