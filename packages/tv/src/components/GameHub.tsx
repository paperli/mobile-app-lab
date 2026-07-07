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
// TV bezel (screen px) used when `frame` is on and the viewport is sub-native.
const FRAME_MARGIN = 28; // breathing room between the TV and the viewport edge
const FRAME_BEZEL = 18; // frame thickness on top / left / right
const FRAME_CHIN = 16; // extra thickness on the bottom edge (for the brand/LED)
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
  /** Append a "See all games" tile as the last item (opens the All Games page). */
  seeAll?: boolean;
}

/** One navigable row below the hero (a shelf, a grid row, or the promo banner). */
interface NavRow {
  games: HubGame[];
  variant: TileVariant;
  slideshow: boolean;
  /** Single full-width focusable item (no tiles), e.g. the free-trial banner. */
  banner?: boolean;
  /** Row ends with an extra "See all games" tile (focusable at index games.length). */
  seeAll?: boolean;
}

/** Effective focusable item count for a row (games + optional See-all tile). */
const navRowLen = (r: NavRow) => r.games.length + (r.seeAll ? 1 : 0);

// Full 30-game catalog (phase 1). Phase 0 uses a 12-game slice of it.
const HUB_CATALOG = HUB_GAMES;
const HERO_GAMES = HUB_CATALOG.slice(0, 3); // 3 featured slides → 3 dots

// "All Games" grid (variation 2): every game in the catalog, GRID_COLS per row.
const ALL_GAMES = HUB_CATALOG;
const GRID_COLS = 5;

function chunk<T>(arr: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// The full-catalog grid shown on the "See all games" page.
const ALL_GAMES_GRID = chunk(ALL_GAMES, GRID_COLS);

// Pick specific catalog games by index (for faked, themed genre rows).
const pick = (...idx: number[]) => idx.map((i) => HUB_CATALOG[i]);

const ROWS: RowDef[] = [
  // Faked "continue playing" row — 2 recently-played games, same sm style.
  { key: 'jumpback', title: 'Jump Back On', variant: 'sm', slideshow: false, games: pick(1, 7) },
  { key: 'more', title: 'New on Weekend', variant: 'sm', slideshow: false, games: HUB_CATALOG.slice(0, 8) },
  {
    key: 'community',
    title: 'Games That Go Viral',
    sub: "The games everyone's talking about right now",
    variant: 'lg',
    slideshow: true,
    games: HUB_CATALOG.slice(8, 12),
  },
  // Genre shelves (phase 1 / variation 1 only) — faked with catalog games.
  { key: 'fromtv', title: 'From Famous TV Shows', variant: 'sm', slideshow: false, games: pick(0, 3, 1, 16, 29, 4) },
  { key: 'party', title: 'Party Starters', variant: 'sm', slideshow: false, games: HUB_CATALOG.slice(12, 21) },
  { key: 'coop', title: 'Work Together', variant: 'sm', slideshow: false, games: pick(18, 19, 22, 8, 27, 24) },
  { key: 'family', title: 'Family Game Night', variant: 'sm', slideshow: false, games: pick(2, 9, 5, 12, 28, 13) },
  { key: 'popculture', title: 'Pop Culture', variant: 'sm', slideshow: false, games: pick(1, 16, 14, 25, 15, 26) },
  { key: 'brain', title: 'Brain Benders', variant: 'sm', slideshow: false, games: HUB_CATALOG.slice(21, 30) },
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
// Clearance below the v3 preview so a focused row's ring/scale isn't clipped.
const PREVIEW_GAP = 28;

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
@keyframes hubHeroPan { from { transform: translate(0, -50%); } to { transform: translate(-33.333%, -50%); } }
@keyframes hubHeroPanX { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }
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

/**
 * Hub prototype phases.
 *   0 = grid-only browse: large hero (preview-on-focus) + a titleless "All
 *       Games" grid (12 games) + the free-trial banner below it.
 *   1 = the full Figma "Multiplatform Hub" build.
 */
export const HUB_PHASES = [0, 1] as const;
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
  /**
   * Wrap the 1920×1080 stage in a TV bezel when the viewport is smaller than
   * native, so the whole thing fits without overscroll. Off by default (a real
   * TV renders full-bleed); the static demo turns it on.
   */
  frame?: boolean;
}

interface NavState {
  sec: number; // 0 = hero, 1..N = rows
  col: number; // focused tile within the row
  heroSlide: number;
}

/**
 * Scale a 1920×1080 stage to fill the viewport (letterbox on mismatch). When
 * `framed` is requested and the viewport is smaller than native, reserve room
 * for the TV bezel + outer margin so the framed set fits without overscroll.
 */
function useFitScale(framed: boolean) {
  const [fit, setFit] = useState({ scale: 1, framed: false });
  useLayoutEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const showFrame = framed && (vw < STAGE_W || vh < STAGE_H);
      // Bezel + margin eats into the space available for the stage itself.
      const reserveW = showFrame ? 2 * (FRAME_MARGIN + FRAME_BEZEL) : 0;
      const reserveH = showFrame ? 2 * FRAME_MARGIN + 2 * FRAME_BEZEL + FRAME_CHIN : 0;
      const scale = Math.min((vw - reserveW) / STAGE_W, (vh - reserveH) / STAGE_H);
      setFit({ scale, framed: showFrame });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [framed]);
  return fit;
}

export const GameHub = forwardRef<HubHandle, GameHubProps>(function GameHub(
  { roomCode, onLaunch, showPairing = false, phase = 1, variation = 1, frame = false },
  ref
) {
  // Unknown values fall back to 1. Future phases/variations branch on these.
  const resolvedPhase = (HUB_PHASES as readonly number[]).includes(phase) ? phase : 1;
  const resolvedVariation = (HUB_VARIATIONS as readonly number[]).includes(variation) ? variation : 1;
  // "Preview mode" (variation 3, and phase 0): keep the large hero at section 0
  // but show a pinned game-info preview at the top while a tile is focused, and
  // launch directly on OK (no side panel). Phase 0 also strips the hub down to
  // just the All Games grid. Kept in refs for the input callbacks.
  const isPhase0 = resolvedPhase === 0;
  const previewMode = resolvedVariation === 3 || isPhase0;
  const isV3 = previewMode; // preview-mode behaviour (hero preview + direct launch)
  const isV3Ref = useRef(isV3);
  isV3Ref.current = isV3;

  // Free-trial promo as the first hero slide: all phase-1 variations, plus the
  // phase-0/variation-1 grid layout.
  const showPromoSlide = !isPhase0 || resolvedVariation === 1;
  const promoOffset = showPromoSlide ? 1 : 0;
  const heroSlideCount = HERO_GAMES.length + promoOffset;
  const isPromoSlide = (i: number) => showPromoSlide && i === 0;
  const heroGameAt = (i: number) => HERO_GAMES[i - promoOffset];
  const isPromoSlideRef = useRef(isPromoSlide);
  isPromoSlideRef.current = isPromoSlide;
  const heroSlideCountRef = useRef(heroSlideCount);
  heroSlideCountRef.current = heroSlideCount;

  const { scale, framed } = useFitScale(frame);
  const [nav, setNav] = useState<NavState>({ sec: 0, col: 0, heroSlide: 0 });
  const [pressing, setPressing] = useState(false);
  const [shot, setShot] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  // Game-info side panel: which game (null = closed) + focused action index.
  const [panel, setPanel] = useState<{ game: HubGame | null; focus: number }>({ game: null, focus: 0 });
  const [panelShot, setPanelShot] = useState(0);
  const [favorites, setFavorites] = useState<ReadonlySet<string>>(() => new Set());
  // "See all games" page (opened from the New on Weekend row in v1/phase 1).
  const [allGamesOpen, setAllGamesOpen] = useState(false);
  const [agNav, setAgNav] = useState({ row: 0, col: 0 });
  const [agScrollY, setAgScrollY] = useState(0);
  // Full-screen upsell page (opened via MORE INFO on the free-trial slide).
  const [upsellOpen, setUpsellOpen] = useState(false);

  const navRef = useRef(nav);
  navRef.current = nav;
  const allGamesOpenRef = useRef(allGamesOpen);
  allGamesOpenRef.current = allGamesOpen;
  const agNavRef = useRef(agNav);
  agNavRef.current = agNav;
  const agRowRefs = useRef<(HTMLElement | null)[]>([]);
  const agScrollerRef = useRef<HTMLDivElement>(null);
  const upsellOpenRef = useRef(upsellOpen);
  upsellOpenRef.current = upsellOpen;
  const panelRef = useRef(panel);
  panelRef.current = panel;
  const colMemoryRef = useRef<number[]>([]);
  const rowRefs = useRef<(HTMLElement | null)[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Ordered sections below the hero. Both nav and render derive from this list,
  // so section index = list index + 1 (section 0 is the hero).
  //   phase 0: just the (12-game) grid, then the promo banner — no shelves.
  //   phase 1: shelves; variations 2 & 3 drop Party/Brain for an All Games
  //            grid, with the banner below Community Crafted Games.
  const gridGames = isPhase0 ? HUB_CATALOG.slice(0, 12) : ALL_GAMES;
  const gridChunks = isPhase0 || resolvedVariation >= 2 ? chunk(gridGames, GRID_COLS) : [];
  // "Jump Back On" is currently hidden in every variation.
  const visibleShelves =
    resolvedVariation >= 2
      ? ROWS.filter((r) => r.key === 'more' || r.key === 'community')
      : ROWS.filter((r) => r.key !== 'jumpback');

  // Real favorites (v1/v2 only): the panel's Add/Remove toggles this set, which
  // populates a "Favorites" row at the top of the hub.
  const favoriteGames = HUB_CATALOG.filter((g) => favorites.has(g.id));
  const showFavRow = !isPhase0 && favoriteGames.length > 0;

  type SectionDef =
    | { kind: 'shelf'; row: RowDef }
    | { kind: 'banner' }
    | { kind: 'grid'; games: HubGame[]; gridIndex: number };
  const sections: SectionDef[] = [];
  if (isPhase0) {
    gridChunks.forEach((games, gridIndex) => sections.push({ kind: 'grid', games, gridIndex }));
    sections.push({ kind: 'banner' });
  } else {
    if (showFavRow) {
      sections.push({
        kind: 'shelf',
        row: { key: 'favorites', title: 'Favorites', variant: 'sm', slideshow: false, games: favoriteGames },
      });
    }
    // v1/phase 1: New on Weekend shows 5 games + a "See all games" tile.
    const showSeeAll = resolvedVariation === 1;
    visibleShelves.forEach((row) => {
      const shelf =
        showSeeAll && row.key === 'more' ? { ...row, games: row.games.slice(0, 5), seeAll: true } : row;
      sections.push({ kind: 'shelf', row: shelf });
      if (row.key === 'community') sections.push({ kind: 'banner' });
    });
    gridChunks.forEach((games, gridIndex) => sections.push({ kind: 'grid', games, gridIndex }));
  }

  const navRows: NavRow[] = sections.map((s) => {
    if (s.kind === 'shelf')
      return { games: s.row.games, variant: s.row.variant, slideshow: s.row.slideshow, seeAll: s.row.seeAll };
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

  const openUpsell = useCallback(() => {
    upsellOpenRef.current = true;
    setUpsellOpen(true);
    soundManager.playSelectionSound();
  }, []);

  const closeUpsell = useCallback(() => {
    upsellOpenRef.current = false;
    setUpsellOpen(false);
    soundManager.playNavigationSound();
  }, []);

  const launch = useCallback(
    (autoDelay = 150) => {
      const cur = navRef.current;
      // MORE INFO on the promo hero slide opens the full-screen upsell page.
      if (cur.sec === 0 && isPromoSlideRef.current(cur.heroSlide)) {
        openUpsell();
        return;
      }
      const game =
        cur.sec === 0 ? HERO_GAMES[cur.heroSlide] : navRowsRef.current[cur.sec - 1]?.games[cur.col];
      if (game) launchGame(game, autoDelay);
    },
    [launchGame, openUpsell]
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

  const openAllGames = useCallback(() => {
    const n = { row: 0, col: 0 };
    agNavRef.current = n;
    setAgNav(n);
    allGamesOpenRef.current = true;
    setAllGamesOpen(true);
    soundManager.playSelectionSound();
  }, []);

  const closeAllGames = useCallback(() => {
    allGamesOpenRef.current = false;
    setAllGamesOpen(false);
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

    // The upsell page has nothing to navigate.
    if (upsellOpenRef.current) return;

    // All Games page: roving focus over the full grid (closest-item vertical).
    if (allGamesOpenRef.current) {
      const cur = agNavRef.current;
      let { row, col } = cur;
      let s: 'nav' | 'bounce' | null = null;
      if (dx !== 0) {
        const nc = col + (dx > 0 ? 1 : -1);
        if (nc < 0 || nc >= (ALL_GAMES_GRID[row]?.length ?? 0)) s = 'bounce';
        else { col = nc; s = 'nav'; }
      } else if (dy !== 0) {
        const nr = row + (dy > 0 ? 1 : -1);
        if (nr < 0 || nr >= ALL_GAMES_GRID.length) s = 'bounce';
        else { row = nr; col = Math.max(0, Math.min(col, (ALL_GAMES_GRID[nr]?.length ?? 1) - 1)); s = 'nav'; }
      }
      if (s === 'nav') {
        const n = { row, col };
        agNavRef.current = n;
        setAgNav(n);
        soundManager.playNavigationSound();
      } else if (s === 'bounce') {
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
        const count = heroSlideCountRef.current;
        const hs = (prev.heroSlide + (dx > 0 ? 1 : -1) + count) % count;
        next = { ...prev, heroSlide: hs };
        sound = 'nav';
      } else if (rows[prev.sec - 1]?.banner) {
        sound = 'bounce'; // banner is a single full-width item
      } else {
        const len = rows[prev.sec - 1] ? navRowLen(rows[prev.sec - 1]) : 0;
        const nc = prev.col + (dx > 0 ? 1 : -1);
        if (nc < 0 || nc >= len) sound = 'bounce';
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
            : Math.max(0, Math.min(prev.col, (targetRow ? navRowLen(targetRow) : 1) - 1));
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
        const next = { ...navRef.current, sec: 0, heroSlide: hIdx + promoOffset };
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
      // Upsell page: Back returns to the hub (QR is the only CTA).
      if (upsellOpenRef.current) {
        if (action === 'back') closeUpsell();
        return;
      }
      // All Games page: OK opens the focused game's panel; Back returns to hub.
      if (allGamesOpenRef.current) {
        if (action === 'back') {
          closeAllGames();
        } else if (action === 'ok') {
          const cur = agNavRef.current;
          const g = ALL_GAMES_GRID[cur.row]?.[cur.col];
          if (g) openPanel(g);
        }
        return;
      }
      // Panel closed: OK on the hero plays now; OK on a tile opens its panel.
      if (action === 'ok') {
        const cur = navRef.current;
        if (cur.sec === 0) {
          launch(); // hero CTA (all variations)
          return;
        }
        const row = navRowsRef.current[cur.sec - 1];
        if (row?.seeAll && cur.col >= row.games.length) {
          openAllGames(); // the trailing "See all games" tile
          return;
        }
        const g = row?.games[cur.col];
        if (!g) return;
        if (isV3Ref.current) launchGame(g); // variation 3: launch directly
        else openPanel(g);
      }
    },
    [closePanel, closeAllGames, closeUpsell, openAllGames, launchGame, toggleFavorite, launch, openPanel]
  );

  useImperativeHandle(
    ref,
    () => ({
      navigate,
      action: doAction,
      focusGame,
      isPanelOpen: () =>
        panelRef.current.game !== null || allGamesOpenRef.current || upsellOpenRef.current,
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
        const n = { ...p, heroSlide: (p.heroSlide + 1) % heroSlideCount };
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

  // Favorites changed: keep hub focus on the same row when the Favorites row
  // appears/disappears at the top, and clamp the column if that row shrank.
  const favRowPresentRef = useRef(showFavRow);
  useEffect(() => {
    const rowAppearedOrLeft = showFavRow !== favRowPresentRef.current;
    favRowPresentRef.current = showFavRow; // pure: update ref outside the setState updater
    setNav((n) => {
      if (n.sec === 0) return n;
      const sec = rowAppearedOrLeft ? Math.max(1, n.sec + (showFavRow ? 1 : -1)) : n.sec;
      const row = navRowsRef.current[sec - 1];
      const col = Math.max(0, Math.min(n.col, (row?.games.length ?? 1) - 1));
      if (sec === n.sec && col === n.col) return n;
      const ns = { ...n, sec, col };
      navRef.current = ns;
      return ns;
    });
  }, [showFavRow, favorites]);

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
    // v3 parks the focused row a little below the preview overlay so its focus
    // ring isn't clipped; other variations leave headroom above the row.
    const target = isV3 ? el.offsetTop - PREVIEW_H - PREVIEW_GAP : el.offsetTop - 120;
    setScrollY(Math.min(Math.max(0, target), max));
  }, [nav.sec, isV3]);

  // All Games page: scroll the focused grid row into view.
  useLayoutEffect(() => {
    if (!allGamesOpen) {
      setAgScrollY(0);
      return;
    }
    const el = agRowRefs.current[agNav.row];
    const sc = agScrollerRef.current;
    if (!el || !sc) return;
    const max = Math.max(0, sc.offsetHeight - STAGE_H);
    setAgScrollY(Math.min(Math.max(0, el.offsetTop - 220), max));
  }, [allGamesOpen, agNav.row]);

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
  const heroGame = heroGameAt(nav.heroSlide);
  const trialUrl = 'https://weekend.tv/free-trial';

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
                style={{
                  display: 'flex',
                  gap: t.gap,
                  padding: `0 ${SHELF_PAD}px`,
                  marginTop: s.gridIndex === 0 ? 0 : t.gap,
                }}
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
        const maxIdx = row.games.length - 1 + (row.seeAll ? 1 : 0);
        const col = focusedHere ? nav.col : Math.min(colMemoryRef.current[sectionIndex] ?? 0, maxIdx);
        const step = t.w + t.gap;
        const trackX = -Math.max(0, col - (t.visible - 1)) * step;
        return (
          <section
            key={row.key}
            ref={(el) => (rowRefs.current[sectionIndex - 1] = el)}
            style={{ marginTop: si === 0 ? 40 : 36, paddingBottom: 12 }}
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
              {row.seeAll && (
                <SeeAllTile
                  variant={row.variant}
                  focused={focusedHere && col === row.games.length}
                  onClick={() => {
                    colMemoryRef.current[sectionIndex] = row.games.length;
                    const n = { ...navRef.current, sec: sectionIndex, col: row.games.length };
                    navRef.current = n;
                    setNav(n);
                    openAllGames();
                  }}
                />
              )}
            </div>
          </section>
        );
      })}

      <div style={{ height: 100 }} />
    </>
  );

  const stageEl = (
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
          // Framed: anchor to the clip box's top-left so the scaled stage fills
          // it exactly. Full-bleed: scale about the centre and letterbox.
          transformOrigin: framed ? 'top left' : 'center center',
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
              promo={isPromoSlide(nav.heroSlide)}
              game={heroGame}
              promoGames={HUB_CATALOG}
              trialUrl={trialUrl}
              phase={heroTransFrom !== null ? 'in' : 'idle'}
              heroFocused={nav.sec === 0}
              pressing={pressing}
              onPlay={handleHeroPlay}
            />
            {heroTransFrom !== null && (
              <HeroSlide
                key={`hero-out-${heroTransFrom}`}
                promo={isPromoSlide(heroTransFrom)}
                game={heroGameAt(heroTransFrom)}
                promoGames={HUB_CATALOG}
                trialUrl={trialUrl}
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
              {Array.from({ length: heroSlideCount }).map((_, i) => {
                const active = i === nav.heroSlide;
                const countdown = active && nav.sec === 0 && !reduceMotion && !panel.game;
                return (
                  <span
                    key={`dot-${i}`}
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

        {/* ── All Games page (opened from the "See all games" tile) ── */}
        {allGamesOpen && (
          <div style={{ position: 'absolute', inset: 0, background: STAGE_BG, zIndex: 6, overflow: 'hidden' }}>
            <div
              ref={agScrollerRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: STAGE_W,
                transform: `translateY(${-agScrollY}px)`,
                transition: 'transform 460ms cubic-bezier(.22,.61,.36,1)',
              }}
            >
              <div style={{ padding: '56px 80px 28px' }}>
                <h2 style={{ margin: 0, fontSize: 44, fontWeight: 800, letterSpacing: '-0.02em', color: INK }}>
                  All Games
                </h2>
                <p style={{ margin: '10px 0 0', fontSize: 20, color: '#8a8a9a' }}>Press Back to return to the hub</p>
              </div>
              {ALL_GAMES_GRID.map((rowGames, r) => (
                <div
                  key={r}
                  ref={(el) => (agRowRefs.current[r] = el)}
                  style={{
                    display: 'flex',
                    gap: TILE.grid.gap,
                    padding: `0 ${SHELF_PAD}px`,
                    marginTop: r === 0 ? 0 : TILE.grid.gap,
                  }}
                >
                  {rowGames.map((g, i) => (
                    <Tile
                      key={g.id}
                      game={g}
                      variant="grid"
                      focused={agNav.row === r && agNav.col === i}
                      pressing={pressing && agNav.row === r && agNav.col === i}
                      slideshow={false}
                      shot={shot}
                      onClick={() => {
                        const n = { row: r, col: i };
                        agNavRef.current = n;
                        setAgNav(n);
                        openPanel(g);
                      }}
                    />
                  ))}
                </div>
              ))}
              <div style={{ height: 100 }} />
            </div>
          </div>
        )}

        {/* ── Upsell page (MORE INFO on the free-trial slide) ──────── */}
        {upsellOpen && (
          <div style={{ position: 'absolute', inset: 0, background: STAGE_BG, zIndex: 8, overflow: 'hidden' }}>
            <TileMontage games={HUB_CATALOG} />
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(to right, ${STAGE_BG} 0%, ${STAGE_BG} 30%, transparent 62%)`,
              }}
            />
            {/* Weekend wordmark */}
            <div
              style={{
                position: 'absolute',
                left: 140,
                top: 64,
                fontFamily: FONT,
                fontWeight: 800,
                fontSize: 44,
                letterSpacing: '-0.02em',
                color: INK,
              }}
            >
              weekend
            </div>
            {/* Title + subtitle */}
            <div style={{ position: 'absolute', left: 140, top: 232, width: 760 }}>
              <h2 style={{ margin: 0, fontFamily: FONT, fontWeight: 800, fontSize: 60, lineHeight: 1.08, letterSpacing: '-0.02em', color: INK }}>
                Scan QR to connect &amp; start playing!
              </h2>
              <p style={{ margin: '24px 0 0', fontSize: 24, lineHeight: 1.4, color: 'rgba(243,244,241,0.72)', maxWidth: 640 }}>
                One step away from playing Jeopardy!, Song Quiz, and more Weekend games on your TV!
              </p>
            </div>
            {/* QR + scan hint */}
            <div style={{ position: 'absolute', left: 140, top: 600, display: 'flex', alignItems: 'flex-start', gap: 36 }}>
              <div style={{ background: '#fff', padding: 24, borderRadius: 24, lineHeight: 0, boxShadow: '0 30px 80px rgba(0,0,0,0.85), 0 8px 24px rgba(0,0,0,0.6)' }}>
                <QRCodeSVG value={mobileUrl} size={300} level="M" includeMargin={false} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 40, paddingTop: 12 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 12,
                    alignSelf: 'flex-start',
                    padding: '14px 22px',
                    borderRadius: 9999,
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.16)',
                    color: INK,
                    fontSize: 22,
                    fontWeight: 600,
                  }}
                >
                  <span style={{ fontSize: 22 }}>▢</span> Scan with your phone camera
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, color: 'rgba(243,244,241,0.82)', fontSize: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span>Or go to</span>
                    <span style={{ padding: '8px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.12)', color: INK, fontWeight: 700 }}>
                      pair.weekend.com
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span>and enter this code</span>
                    <span
                      style={{
                        padding: '8px 16px',
                        borderRadius: 12,
                        background: 'rgba(255,255,255,0.12)',
                        color: INK,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {roomCode || 'X47H'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {/* Back hint */}
            <div style={{ position: 'absolute', left: 140, bottom: 44, fontSize: 18, color: '#8a8a9a' }}>
              Press Back to return
            </div>
          </div>
        )}

        {/* ── Game info side panel ───────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 20,
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
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: framed ? '#050506' : '#000',
        overflow: 'hidden',
      }}
    >
      {framed ? (
        // Sub-native viewport: seat the scaled stage inside a TV bezel that is
        // itself sized to fit, so nothing overscrolls.
        <div
          style={{
            width: STAGE_W * scale + 2 * FRAME_BEZEL,
            height: STAGE_H * scale + 2 * FRAME_BEZEL + FRAME_CHIN,
            padding: `${FRAME_BEZEL}px ${FRAME_BEZEL}px ${FRAME_BEZEL + FRAME_CHIN}px`,
            boxSizing: 'border-box',
            borderRadius: FRAME_BEZEL + 14,
            background: 'linear-gradient(160deg, #2a2b2e 0%, #151517 42%, #0c0c0e 100%)',
            boxShadow:
              '0 2px 0 rgba(255,255,255,0.06) inset, 0 -2px 0 rgba(0,0,0,0.6) inset, 0 40px 90px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.55)',
            position: 'relative',
          }}
        >
          {/* The screen: clips the scaled stage to rounded corners. */}
          <div
            style={{
              width: STAGE_W * scale,
              height: STAGE_H * scale,
              overflow: 'hidden',
              borderRadius: 6,
              background: '#000',
            }}
          >
            {stageEl}
          </div>
          {/* Power LED on the bottom chin. */}
          <div
            style={{
              position: 'absolute',
              bottom: (FRAME_BEZEL + FRAME_CHIN) / 2 - 3,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 40% 35%, #d8d8dc, #6a6a70)',
              boxShadow: '0 0 6px rgba(220,220,225,0.5)',
            }}
          />
        </div>
      ) : (
        stageEl
      )}
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

// ── Tile montage ──────────────────────────────────────────────────────────────
// A tilted, multi-row wall of game tiles panning diagonally (alternating rows).
// Used behind the free-trial promo slide and the upsell page.
function TileMontage({ games }: { games: HubGame[] }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: '-28%',
        transform: 'rotate(-8deg)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 20,
      }}
    >
      {[0, 1, 2, 3, 4].map((r) => {
        const rowGames = games.slice(r).concat(games.slice(0, r));
        return (
          <div
            key={r}
            style={{
              display: 'flex',
              gap: 20,
              width: 'max-content',
              marginLeft: r % 2 ? -160 : 0,
              animation: `hubHeroPanX ${110 + r * 8}s linear infinite ${r % 2 ? 'reverse' : 'normal'}`,
            }}
          >
            {[...rowGames, ...rowGames, ...rowGames].map((g, i) => (
              <div key={i} style={{ width: 300, height: 169, flex: '0 0 auto' }}>
                <GameArt game={g} variant="tile" style={{ width: '100%', height: '100%', borderRadius: 12 }} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
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
  /** Free-trial promo slide (panning tiles + QR) instead of a game. */
  promo?: boolean;
  game?: HubGame;
  /** Games to pan across the promo slide's art. */
  promoGames?: HubGame[];
  trialUrl?: string;
  phase: HeroPhase;
  /** Whether the hero section currently holds D-pad focus. */
  heroFocused: boolean;
  pressing: boolean;
  onPlay: () => void;
}

function HeroSlide({ promo, game, promoGames = [], trialUrl = '', phase, heroFocused, pressing, onPlay }: HeroSlideProps) {
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
        {promo ? (
          <>
            {/* Panning montage — tilted multi-row wall of game tiles. */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 620, overflow: 'hidden' }}>
              <TileMontage games={promoGames} />
            </div>
            {/* QR code popping over the montage */}
            <div
              style={{
                position: 'absolute',
                right: 140,
                top: '50%',
                transform: 'translateY(-50%)',
                background: '#fff',
                padding: 28,
                borderRadius: 28,
                lineHeight: 0,
                boxShadow: '0 30px 80px rgba(0,0,0,0.85), 0 8px 24px rgba(0,0,0,0.6)',
              }}
            >
              <QRCodeSVG value={trialUrl} size={300} level="M" includeMargin={false} />
            </div>
          </>
        ) : (
          game && (
            <GameArt
              game={game}
              variant="hero"
              style={{ position: 'absolute', top: 0, left: 0, width: STAGE_W, height: 620 }}
            />
          )
        )}
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
        {promo ? (
          <>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.14em', color: '#b9babe' }}>
              WEEKEND PREMIUM
            </span>
            <span
              style={{
                fontFamily: FONT,
                fontWeight: 800,
                fontSize: 84,
                letterSpacing: '-0.02em',
                lineHeight: 1.02,
                color: INK,
              }}
            >
              7-day free trial
            </span>
            <p style={{ margin: 0, maxWidth: 620, fontSize: 26, lineHeight: 1.35, color: 'rgba(243,244,241,0.82)' }}>
              Unlimited access to every game. Scan the code to start.
            </p>
          </>
        ) : (
          game && (
            <>
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
            </>
          )
        )}
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
          {promo ? 'MORE INFO' : 'PLAY NOW'}
        </button>
      </div>
    </div>
  );
}

// ── "See all games" tile (trailing tile that opens the All Games page) ────────
function SeeAllTile({ variant, focused, onClick }: { variant: TileVariant; focused: boolean; onClick: () => void }) {
  const t = TILE[variant];
  return (
    <button
      onClick={onClick}
      style={{
        appearance: 'none',
        flex: '0 0 auto',
        width: t.w,
        height: t.h,
        borderRadius: t.r,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        background: '#141518',
        border: '1px dashed #3a3b3f',
        color: INK,
        fontFamily: FONT,
        transform: focused ? 'scale(1.06)' : 'scale(1)',
        boxShadow: focused ? '0 0 0 4px #fff, 0 26px 60px rgba(0,0,0,0.7)' : 'none',
        transition: 'transform 240ms cubic-bezier(.22,.61,.36,1), box-shadow 240ms ease',
        zIndex: focused ? 3 : 1,
      }}
    >
      <span style={{ fontSize: variant === 'lg' ? 34 : 24, fontWeight: 700, letterSpacing: '-0.01em' }}>
        See all games
      </span>
      <span style={{ fontSize: variant === 'lg' ? 26 : 20, color: '#9a9ba0' }}>→</span>
    </button>
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
