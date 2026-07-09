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
  /** Interactive puzzle row (question + inline answers), navigated specially. */
  puzzle?: boolean;
  /** Row ends with an extra "See all games" tile (focusable at index games.length). */
  seeAll?: boolean;
}

/** Effective focusable item count for a row (games + optional See-all tile). */
const navRowLen = (r: NavRow) => r.games.length + (r.seeAll ? 1 : 0);

// Full 30-game catalog (phase 1). Phase 0 uses a 12-game slice of it.
const HUB_CATALOG = HUB_GAMES;
const WOF_ID = 'wheel-of-fortune';
// 3 featured slides → 3 dots. The first slot advertises the newly released
// Wheel of Fortune (swapped in for the original Jeopardy slide).
const HERO_GAMES = (() => {
  const base = HUB_CATALOG.slice(0, 3);
  const wof = HUB_CATALOG.find((g) => g.id === WOF_ID);
  return wof ? [wof, ...base.slice(1)] : base;
})();

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
  lg: { w: 545, h: (545 * 9) / 16, r: 16, gap: 28, visible: 3 },
  grid: { w: 332, h: (332 * 9) / 16, r: 12, gap: 24, visible: GRID_COLS },
} as const;

const SHELF_PAD = 80;

// ── Top navigation (phase 1 only) ────────────────────────────────────────────
type Page = 'search' | 'home' | 'mygames';
type PuzzleStage = 'question' | 'result' | 'followup' | 'thanks' | 'done';
const NAV_BAR_H = 96;
const TOP_NAV: { key: Page; label: string }[] = [
  { key: 'search', label: 'Search' },
  { key: 'home', label: 'Home' },
  { key: 'mygames', label: 'My Games' },
];
const HOME_TAB = TOP_NAV.findIndex((t) => t.key === 'home'); // default focus

// Games featured in the My Games empty state (a nudge to start playing).
const MYGAMES_EMPTY_IDS = ['jeopardy', 'song-quiz', 'wits-end'];

// Profiles (prototype): four switchable players with editable names.
const PROFILE_NAMES_DEFAULT = ['Alex', 'Jamie', 'Riley', 'Sam'];
const PROFILE_MENU = ['Settings', 'Switch Profile'] as const;

// On-screen alphabet keyboard for the Search page (TV-style, not QWERTY). Rows
// of letters plus an action row; navigation clamps the column per row.
const KB_GRID: string[][] = [
  ['A', 'B', 'C', 'D', 'E', 'F'],
  ['G', 'H', 'I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P', 'Q', 'R'],
  ['S', 'T', 'U', 'V', 'W', 'X'],
  ['Y', 'Z'],
  ['SPACE', 'DELETE', 'CLEAR'],
];

// Height of the hero band, and (variation 3) the pinned top preview height.
const HERO_SECTION_H = 700;
const PREVIEW_H = 480;
// Clearance below the v3 preview so a focused row's ring/scale isn't clipped.
const PREVIEW_GAP = 28;

// How long each hero slide stays before auto-advancing. The active dot fills
// over this same duration as a countdown.
const HERO_AUTOPLAY_MS = 6000;
// Per-shot dwell for the game-info panel's screenshot slideshow (+ dot countdown).
const PANEL_SHOT_MS = 2600;

// Puzzle row timings: how long the result/thanks screens hold before advancing,
// and how fast the lyric lines scroll.
const PUZZLE_ADVANCE_MS = 3000;
const PUZZLE_LYRIC_MS = 2200;
// Song-quiz puzzle. Lyrics are original placeholder lines (not a real song).
const SONG_PUZZLE = {
  title: 'Guess who sings this song',
  lyrics: [
    'City lights are calling out my name tonight',
    'Dancing through the rain without a single care',
    'Hold me like the summer never has to end',
    'We were young and always running out of time',
    'Every heartbeat echoes somewhere in the dark',
    'Take my hand and we will find our way back home',
  ],
  options: ['The Midnight Echo', 'Nova Reign', 'Cassette Kids', 'Golden Hour'],
  correct: 2,
  followUp: { question: 'Do you like this game?', options: ['I love it!', 'Not quite'] },
};
// The full game the puzzle promotes (shown as a tile after "Thank you!").
const SONG_QUIZ_GAME = HUB_GAMES.find((g) => g.id === 'song-quiz');
// Games related to Song Quiz, shown as a center-locked scroller on the puzzle's
// final "Play more on" screen: the focused tile stays in the middle while ◀▶
// scroll the pool. Song Quiz sits centered to start.
const RELATED_GAMES = ['beat-breaker', 'song-quiz', 'karaoke-kings', 'music-maestro', 'dance-floor']
  .map((id) => HUB_GAMES.find((g) => g.id === id))
  .filter((g): g is HubGame => !!g);
// Initial center index — Song Quiz — for the "Play more on" scroller.
const RELATED_START = Math.max(0, RELATED_GAMES.findIndex((g) => g.id === 'song-quiz'));

// Hero slide-change choreography (see HeroSlide): outgoing art fades + slides
// left; incoming art/text fade in. Plus the active-dot countdown fill.
const HERO_ANIM_CSS = `
@keyframes hubHeroImgOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(-60px); } }
@keyframes hubHeroFadeOut { from { opacity: 1; } to { opacity: 0; } }
@keyframes hubHeroFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes hubHeroDotFill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes hubHeroPan { from { transform: translate(0, -50%); } to { transform: translate(-33.333%, -50%); } }
@keyframes hubHeroPanX { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }
/* Gift icon: lift + scale up + wiggle for a beat, then rest, then repeat. */
@keyframes hubGiftWiggle {
  0%   { transform: translateY(0) scale(1) rotate(0deg); }
  5%   { transform: translateY(-5px) scale(1.28) rotate(-12deg); }
  10%  { transform: translateY(-5px) scale(1.28) rotate(11deg); }
  15%  { transform: translateY(-5px) scale(1.24) rotate(-9deg); }
  20%  { transform: translateY(-4px) scale(1.22) rotate(8deg); }
  25%  { transform: translateY(-3px) scale(1.12) rotate(-4deg); }
  30%  { transform: translateY(0) scale(1) rotate(0deg); }
  100% { transform: translateY(0) scale(1) rotate(0deg); }
}
/* Puzzle lyrics: the 3-line block slides up as each new line becomes current. */
@keyframes puzzleLyricScroll {
  0%   { transform: translateY(38px); opacity: 0.35; }
  100% { transform: translateY(0); opacity: 1; }
}
/* Wheel of Fortune hero: the wheel spins several turns then decelerates to rest. */
@keyframes wofSpin { from { transform: rotate(0deg); } to { transform: rotate(1800deg); } }
/* The winning score pops in once the wheel has settled. */
@keyframes wofScorePop {
  0%   { opacity: 0; transform: scale(0.4); }
  70%  { opacity: 1; transform: scale(1.12); }
  100% { opacity: 1; transform: scale(1); }
}
/* Song Quiz "now playing" badge: the disc spins continuously like a record. */
@keyframes puzzleNoteSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
/* Party Mode hero: players gently bob; confetti drifts and twinkles. */
@keyframes sqPlayerBob {
  0%, 100% { transform: translateY(var(--bob-lift, 0px)); }
  50%      { transform: translateY(calc(var(--bob-lift, 0px) - 12px)); }
}
@keyframes sqConfetti {
  0%   { transform: translateY(6px) rotate(-12deg); opacity: 0.25; }
  50%  { transform: translateY(-8px) rotate(10deg); opacity: 0.7; }
  100% { transform: translateY(6px) rotate(-12deg); opacity: 0.25; }
}
`;

// ── Imperative handle exposed to App.tsx ────────────────────────────────────
export interface HubHandle {
  navigate: (direction: NavigationDirection) => void;
  action: (action: NavigationAction) => void;
  /** Focus a game by id (voice "go to X"); optionally launch it. */
  focusGame: (id: string, autoLaunch?: boolean) => void;
  /** True while the game-info side panel is open (so Back closes it first). */
  isPanelOpen: () => boolean;
  /** True when the hub should consume Back (close a modal or escalate to the top nav). */
  wantsBack: () => boolean;
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
  // "Preview mode" (variation 3, and phase-0 variation 1): keep the large hero
  // at section 0 but show a pinned game-info preview at the top while a tile is
  // focused, and launch directly on OK (no side panel). Phase 0 strips the hub
  // down to the All Games grid — variation 1 uses the top preview, variation 2
  // opens the game-info side panel on select instead. Kept in refs for input.
  const isPhase0 = resolvedPhase === 0;
  const previewMode = resolvedVariation === 3 || (isPhase0 && resolvedVariation === 1);
  const isV3 = previewMode; // preview-mode behaviour (hero preview + direct launch)
  const isV3Ref = useRef(isV3);
  isV3Ref.current = isV3;

  // Profile / account (prototype pseudo-state). Default = signed out; the state
  // is in-memory only, so a hard refresh always returns to this logged-out state.
  const [signedIn, setSignedIn] = useState(false);

  // Free-trial promo as the first hero slide. Phase 0/variation 1 always shows
  // it; phase-1 variations show it only while signed out (signed-in users have
  // already claimed the trial).
  const showPromoSlide = isPhase0 ? true : !signedIn;
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
  const [slideshowReady, setSlideshowReady] = useState(false); // 1s delay before a focused tile's slideshow starts
  const [scrollY, setScrollY] = useState(0);
  // Game-info side panel: which game (null = closed) + focused action index.
  const [panel, setPanel] = useState<{ game: HubGame | null; focus: number }>({ game: null, focus: 0 });
  const [panelShot, setPanelShot] = useState(0);
  const [shotViewerOpen, setShotViewerOpen] = useState(false); // full-screen screenshot carousel
  const [favorites, setFavorites] = useState<ReadonlySet<string>>(() => new Set());
  // Recently-played game ids (most recent first, capped at 10) — the source for
  // the "Jump Back On" row. A play is recorded whenever a game is launched.
  const [recentPlays, setRecentPlays] = useState<string[]>([]);
  // "See all games" page (opened from the New on Weekend row in v1/phase 1).
  const [allGamesOpen, setAllGamesOpen] = useState(false);
  const [agNav, setAgNav] = useState({ row: 0, col: 0 });
  const [agScrollY, setAgScrollY] = useState(0);
  // Full-screen upsell page (opened via MORE INFO on the free-trial slide).
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [upsellFading, setUpsellFading] = useState(false); // fade-out on auto-dismiss

  // Puzzle row (phase 1 only): an inline song-quiz question that the user answers
  // with the d-pad. Flow: question -> result -> follow-up -> thanks -> done (row
  // removed). `puzzleCol` is the focused option (2×2 grid in question, 2 in follow-up).
  const [puzzleStage, setPuzzleStage] = useState<PuzzleStage>('question');
  const [puzzleCol, setPuzzleCol] = useState(0);
  const [puzzleSel, setPuzzleSel] = useState<number | null>(null); // chosen answer (question)
  // Follow-up choice is recorded but not currently surfaced in the UI.
  const [, setPuzzleFollowSel] = useState<number | null>(null);
  const [puzzleLyric, setPuzzleLyric] = useState(0); // current lyric line index

  // Top navigation (phase 1 only): Search / Home / My Games. `navFocus` = focus
  // is on the top nav bar. On launch focus starts in the hero (content), not the
  // nav; the Home tab is the default when the user does move up to the nav.
  const hasTopNav = !isPhase0;
  const [page, setPage] = useState<Page>('home');
  const [navFocus, setNavFocus] = useState(false);
  const [navCol, setNavCol] = useState(HOME_TAB);
  // Search page state: query text, on-screen keyboard cursor, and which zone
  // (keyboard vs results grid) currently has focus.
  const [query, setQuery] = useState('');
  const [kb, setKb] = useState({ r: 0, c: 0 });
  const [searchZone, setSearchZone] = useState<'kb' | 'results'>('kb');
  const [resNav, setResNav] = useState({ row: 0, col: 0 });

  // Random pairing code shown in the "Claim Free Trial" focus popover.
  const [pairCode] = useState(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  });
  const [profileIdx, setProfileIdx] = useState(0);
  const [profileNames, setProfileNames] = useState<string[]>(PROFILE_NAMES_DEFAULT);
  // Randomly assign a distinct mock avatar to each profile at launch.
  const [profileAvatars] = useState<number[]>(() => {
    const idx = Array.from({ length: AVATAR_COUNT }, (_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return idx.slice(0, PROFILE_NAMES_DEFAULT.length);
  });
  const [profileMenu, setProfileMenu] = useState<number | null>(null); // dropdown focus (null = closed)
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsFocus, setSettingsFocus] = useState(0); // 0 = member block, 1 = Sign Out
  const [switchOpen, setSwitchOpen] = useState(false);
  const [switchNav, setSwitchNav] = useState<{ col: number; row: 0 | 1 }>({ col: 0, row: 0 }); // row 0 = pick, 1 = edit
  const [signOutConfirm, setSignOutConfirm] = useState(false);
  const [signOutFocus, setSignOutFocus] = useState(0); // 0 = Cancel, 1 = Sign Out
  const [editingProfile, setEditingProfile] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editKb, setEditKb] = useState({ r: 0, c: 0 });
  const [signInDone, setSignInDone] = useState(false); // QR "checked" flash on the sign-in upsell

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
  const pageRef = useRef(page);
  pageRef.current = page;
  const navFocusRef = useRef(navFocus);
  navFocusRef.current = navFocus;
  const navColRef = useRef(navCol);
  navColRef.current = navCol;
  const queryRef = useRef(query);
  queryRef.current = query;
  const kbRef = useRef(kb);
  kbRef.current = kb;
  const searchZoneRef = useRef(searchZone);
  searchZoneRef.current = searchZone;
  const resNavRef = useRef(resNav);
  resNavRef.current = resNav;
  const signedInRef = useRef(signedIn);
  signedInRef.current = signedIn;
  const profileIdxRef = useRef(profileIdx);
  profileIdxRef.current = profileIdx;
  const profileNamesRef = useRef(profileNames);
  profileNamesRef.current = profileNames;
  const profileMenuRef = useRef(profileMenu);
  profileMenuRef.current = profileMenu;
  const settingsOpenRef = useRef(settingsOpen);
  settingsOpenRef.current = settingsOpen;
  const settingsFocusRef = useRef(settingsFocus);
  settingsFocusRef.current = settingsFocus;
  const switchOpenRef = useRef(switchOpen);
  switchOpenRef.current = switchOpen;
  const switchNavRef = useRef(switchNav);
  switchNavRef.current = switchNav;
  const signOutConfirmRef = useRef(signOutConfirm);
  signOutConfirmRef.current = signOutConfirm;
  const signOutFocusRef = useRef(signOutFocus);
  signOutFocusRef.current = signOutFocus;
  const editingProfileRef = useRef(editingProfile);
  editingProfileRef.current = editingProfile;
  const editNameRef = useRef(editName);
  editNameRef.current = editName;
  const editKbRef = useRef(editKb);
  editKbRef.current = editKb;
  const panelRef = useRef(panel);
  panelRef.current = panel;
  const shotViewerOpenRef = useRef(shotViewerOpen);
  shotViewerOpenRef.current = shotViewerOpen;
  const puzzleStageRef = useRef(puzzleStage);
  puzzleStageRef.current = puzzleStage;
  const puzzleColRef = useRef(puzzleCol);
  puzzleColRef.current = puzzleCol;
  const puzzleSecRef = useRef(0); // section index of the puzzle row (set during render when present)
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
  // "Jump Back On" = recently-played games, most recent first (from recentPlays).
  const jumpBackGames = recentPlays
    .map((id) => HUB_CATALOG.find((g) => g.id === id))
    .filter((g): g is HubGame => !!g);
  // My Games empty state: nothing played and nothing favorited yet.
  const myGamesEmpty = jumpBackGames.length === 0 && favoriteGames.length === 0;
  const recommendedGames = MYGAMES_EMPTY_IDS.map((id) => HUB_CATALOG.find((g) => g.id === id)).filter(
    (g): g is HubGame => !!g
  );
  // The Home "Jump Back On" row (phase 1) appears once the user has play history.
  const homeJumpBack = !isPhase0 && jumpBackGames.length > 0;

  // Search results (live-filtered by the on-screen keyboard query).
  const RESULTS_COLS = 3;
  const searchResults = query.trim()
    ? HUB_CATALOG.filter((g) => g.title.toLowerCase().includes(query.trim().toLowerCase()))
    : [];
  const resultChunks = chunk(searchResults, RESULTS_COLS);

  // Only the Home page carries the big hero; My Games / Search start at the top nav.
  const pageHasHero = page === 'home';

  // The puzzle row lives at the top of the phase-1 Home page until it's answered
  // through and self-dismisses (stage 'done').
  const showPuzzle = !isPhase0 && puzzleStage !== 'done';

  type SectionDef =
    | { kind: 'shelf'; row: RowDef }
    | { kind: 'banner' }
    | { kind: 'puzzle' }
    | { kind: 'grid'; games: HubGame[]; gridIndex: number; gridTitle?: string };
  const sections: SectionDef[] = [];
  if (page === 'search') {
    // Search renders its own body (keyboard + results) — no scrolling sections.
  } else if (page === 'mygames') {
    if (myGamesEmpty) {
      // The empty state's featured tiles are a navigable (large) row.
      sections.push({
        kind: 'shelf',
        row: { key: 'recommended', title: '', variant: 'lg', slideshow: true, games: recommendedGames },
      });
    } else {
      if (jumpBackGames.length) {
        sections.push({
          kind: 'shelf',
          row: { key: 'jumpback', title: 'Jump Back On', variant: 'sm', slideshow: false, games: jumpBackGames },
        });
      }
      chunk(favoriteGames, GRID_COLS).forEach((games, gridIndex) =>
        sections.push({ kind: 'grid', games, gridIndex, gridTitle: 'Favorites' })
      );
    }
  } else if (isPhase0) {
    gridChunks.forEach((games, gridIndex) => sections.push({ kind: 'grid', games, gridIndex }));
    sections.push({ kind: 'banner' });
  } else {
    // Jump Back On (all phase-1 variations) — only once the user has played
    // something; same source as the My Games page.
    if (jumpBackGames.length) {
      sections.push({
        kind: 'shelf',
        row: { key: 'jumpback', title: 'Jump Back On', variant: 'sm', slideshow: false, games: jumpBackGames },
      });
    }
    // v1/phase 1: New on Weekend shows 5 games + a "See all games" tile.
    const showSeeAll = resolvedVariation === 1;
    // The song-quiz puzzle row is v1 only (hidden on variations 2 & 3 for now).
    const showPuzzleRow = showPuzzle && resolvedVariation === 1;
    visibleShelves.forEach((row) => {
      const shelf =
        showSeeAll && row.key === 'more' ? { ...row, games: row.games.slice(0, 5), seeAll: true } : row;
      sections.push({ kind: 'shelf', row: shelf });
      // Free-trial banner sits just below "Games That Go Viral" (community).
      if (row.key === 'community') sections.push({ kind: 'banner' });
      // Song-quiz puzzle sits just below "Party Starters".
      if (row.key === 'party' && showPuzzleRow) sections.push({ kind: 'puzzle' });
    });
    gridChunks.forEach((games, gridIndex) => sections.push({ kind: 'grid', games, gridIndex }));
  }

  const navRows: NavRow[] = sections.map((s) => {
    if (s.kind === 'shelf')
      return { games: s.row.games, variant: s.row.variant, slideshow: s.row.slideshow, seeAll: s.row.seeAll };
    if (s.kind === 'grid') return { games: s.games, variant: 'grid' as TileVariant, slideshow: false };
    if (s.kind === 'puzzle') return { games: [], variant: 'sm' as TileVariant, slideshow: false, puzzle: true };
    return { games: [], variant: 'sm' as TileVariant, slideshow: false, banner: true };
  });
  const navRowsRef = useRef(navRows);
  navRowsRef.current = navRows;
  // Remember where the puzzle row sits while it's present, so the dismiss shift
  // only nudges focus for rows below it (rows above are unaffected by its removal).
  if (showPuzzle) {
    const pi = navRows.findIndex((r) => r.puzzle);
    if (pi >= 0) puzzleSecRef.current = pi + 1;
  }
  const pageHasHeroRef = useRef(pageHasHero);
  pageHasHeroRef.current = pageHasHero;
  const hasTopNavRef = useRef(hasTopNav);
  hasTopNavRef.current = hasTopNav;
  const resultChunksRef = useRef(resultChunks);
  resultChunksRef.current = resultChunks;

  const launchGame = useCallback(
    (game: HubGame, autoDelay = 150) => {
      setPressing(true);
      setTimeout(() => setPressing(false), 150);
      soundManager.playSelectionSound();
      // Record the play for "Jump Back On" (most recent first, deduped, max 10).
      setRecentPlays((prev) => [game.id, ...prev.filter((id) => id !== game.id)].slice(0, 10));
      setTimeout(() => onLaunch(game), autoDelay);
    },
    [onLaunch]
  );

  const openUpsell = useCallback(() => {
    upsellOpenRef.current = true;
    setUpsellOpen(true);
    setUpsellFading(false);
    setSignInDone(false); // fresh QR each time the sign-in/upsell opens
    soundManager.playSelectionSound();
  }, []);

  const closeUpsell = useCallback(() => {
    upsellOpenRef.current = false;
    setUpsellOpen(false);
    setUpsellFading(false);
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
        cur.sec === 0
          ? HERO_GAMES[cur.heroSlide - promoOffset]
          : navRowsRef.current[cur.sec - 1]?.games[cur.col];
      if (game) launchGame(game, autoDelay);
    },
    [launchGame, openUpsell, promoOffset]
  );

  const openPanel = useCallback((game: HubGame) => {
    // Focus 0 is the screenshot area; open with the first action focused instead.
    const np = { game, focus: 1 };
    panelRef.current = np;
    setPanel(np);
    soundManager.playSelectionSound();
  }, []);

  const closePanel = useCallback(() => {
    if (!panelRef.current.game) return;
    const np = { game: null, focus: 0 };
    panelRef.current = np;
    setPanel(np);
    shotViewerOpenRef.current = false;
    setShotViewerOpen(false);
    soundManager.playNavigationSound();
  }, []);

  // MORE INFO on a game hero slide → open that game's info side panel.
  const openHeroInfo = useCallback(() => {
    const cur = navRef.current;
    if (isPromoSlideRef.current(cur.heroSlide)) return;
    const g = HERO_GAMES[cur.heroSlide - promoOffset];
    if (g) openPanel(g);
  }, [openPanel, promoOffset]);

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

  // ── Top-nav / page focus ────────────────────────────────────────────────────
  // Move focus up to the top nav bar (highlighting the active page's tab).
  const toNav = useCallback(() => {
    navColRef.current = TOP_NAV.findIndex((t) => t.key === pageRef.current);
    setNavCol(navColRef.current);
    navFocusRef.current = true;
    setNavFocus(true);
    setScrollY(0);
    soundManager.playNavigationSound();
  }, []);

  // Drop focus from the nav bar into the current page's content.
  const enterContent = useCallback(() => {
    const p = pageRef.current;
    if (p === 'mygames') {
      const n = { ...navRef.current, sec: 1, col: 0 };
      navRef.current = n;
      setNav(n);
    } else if (p === 'home') {
      const n = { ...navRef.current, sec: 0 };
      navRef.current = n;
      setNav(n);
    } else {
      searchZoneRef.current = 'kb';
      setSearchZone('kb');
    }
    navFocusRef.current = false;
    setNavFocus(false);
    soundManager.playNavigationSound();
  }, []);

  // Switch page (from an OK on a nav tab) and drop focus into that page.
  const goToPage = useCallback((p: Page) => {
    pageRef.current = p;
    setPage(p);
    setScrollY(0);
    if (p === 'home') {
      const n = { ...navRef.current, sec: 0, col: 0 };
      navRef.current = n;
      setNav(n);
    } else if (p === 'mygames') {
      const n = { sec: 1, col: 0, heroSlide: navRef.current.heroSlide };
      navRef.current = n;
      setNav(n);
    } else {
      searchZoneRef.current = 'kb';
      setSearchZone('kb');
      kbRef.current = { r: 0, c: 0 };
      setKb({ r: 0, c: 0 });
    }
    navFocusRef.current = false;
    setNavFocus(false);
    soundManager.playSelectionSound();
  }, []);

  // Apply an on-screen keyboard key to the search query.
  const applyKey = useCallback((key: string) => {
    setQuery((q) => {
      let n = q;
      if (key === 'SPACE') n = q + ' ';
      else if (key === 'DELETE') n = q.slice(0, -1);
      else if (key === 'CLEAR') n = '';
      else n = q + key;
      queryRef.current = n;
      return n;
    });
    soundManager.playNavigationSound();
  }, []);

  // ── Profile / account callbacks ─────────────────────────────────────────────
  // OK on the profile button: open the dropdown (signed in) or the sign-in
  // upsell (signed out).
  const openProfile = useCallback(() => {
    if (signedInRef.current) {
      profileMenuRef.current = 0;
      setProfileMenu(0);
      soundManager.playSelectionSound();
    } else {
      openUpsell();
    }
  }, [openUpsell]);
  const closeProfileMenu = useCallback(() => {
    profileMenuRef.current = null;
    setProfileMenu(null);
    soundManager.playNavigationSound();
  }, []);
  const openSettings = useCallback(() => {
    profileMenuRef.current = null;
    setProfileMenu(null);
    settingsOpenRef.current = true;
    setSettingsOpen(true);
    settingsFocusRef.current = 0;
    setSettingsFocus(0);
    soundManager.playSelectionSound();
  }, []);
  const closeSettings = useCallback(() => {
    settingsOpenRef.current = false;
    setSettingsOpen(false);
    soundManager.playNavigationSound();
  }, []);
  const openSwitch = useCallback(() => {
    profileMenuRef.current = null;
    setProfileMenu(null);
    switchOpenRef.current = true;
    setSwitchOpen(true);
    const n = { col: profileIdxRef.current, row: 0 as 0 | 1 };
    switchNavRef.current = n;
    setSwitchNav(n);
    soundManager.playSelectionSound();
  }, []);
  const closeSwitch = useCallback(() => {
    switchOpenRef.current = false;
    setSwitchOpen(false);
    soundManager.playNavigationSound();
  }, []);
  const selectProfile = useCallback((i: number) => {
    profileIdxRef.current = i;
    setProfileIdx(i);
    switchOpenRef.current = false;
    setSwitchOpen(false);
    soundManager.playSelectionSound();
  }, []);
  const startEdit = useCallback((i: number) => {
    editingProfileRef.current = i;
    setEditingProfile(i);
    const nm = profileNamesRef.current[i] ?? '';
    editNameRef.current = nm;
    setEditName(nm);
    editKbRef.current = { r: 0, c: 0 };
    setEditKb({ r: 0, c: 0 });
    soundManager.playSelectionSound();
  }, []);
  const commitEdit = useCallback(() => {
    const i = editingProfileRef.current;
    if (i !== null) {
      setProfileNames((prev) => {
        const n = [...prev];
        n[i] = editNameRef.current.trim() || prev[i];
        return n;
      });
    }
    editingProfileRef.current = null;
    setEditingProfile(null);
    soundManager.playNavigationSound();
  }, []);
  const applyEditKey = useCallback((key: string) => {
    setEditName((q) => {
      let n = q;
      if (key === 'SPACE') n = q + ' ';
      else if (key === 'DELETE') n = q.slice(0, -1);
      else if (key === 'CLEAR') n = '';
      else n = (q + key).slice(0, 16);
      editNameRef.current = n;
      return n;
    });
    soundManager.playNavigationSound();
  }, []);
  const openSignOutConfirm = useCallback(() => {
    signOutConfirmRef.current = true;
    setSignOutConfirm(true);
    signOutFocusRef.current = 0;
    setSignOutFocus(0);
    soundManager.playSelectionSound();
  }, []);
  const closeSignOutConfirm = useCallback(() => {
    signOutConfirmRef.current = false;
    setSignOutConfirm(false);
    soundManager.playNavigationSound();
  }, []);
  const doSignOut = useCallback(() => {
    signOutConfirmRef.current = false;
    setSignOutConfirm(false);
    settingsOpenRef.current = false;
    setSettingsOpen(false);
    signedInRef.current = false;
    setSignedIn(false);
    soundManager.playSelectionSound();
  }, []);

  const move = useCallback((dx: number, dy: number) => {
    // Full-screen screenshot carousel: ◀▶ swap shots.
    if (shotViewerOpenRef.current) {
      if (dx !== 0) {
        setPanelShot((s) => (s + (dx > 0 ? 1 : -1) + SHOT_VARIANTS.length) % SHOT_VARIANTS.length);
        soundManager.playNavigationSound();
      } else soundManager.playBounceSound();
      return;
    }
    // ── Profile overlays (highest priority) ──
    // Sign-out confirmation: ◀▶ between Cancel / Sign Out.
    if (signOutConfirmRef.current) {
      if (dx !== 0) {
        const nf = signOutFocusRef.current === 0 ? 1 : 0;
        signOutFocusRef.current = nf;
        setSignOutFocus(nf);
        soundManager.playNavigationSound();
      } else soundManager.playBounceSound();
      return;
    }
    // Profile name editor: alphabet keyboard grid.
    if (editingProfileRef.current !== null) {
      let { r, c } = editKbRef.current;
      if (dx !== 0) {
        const nc = c + (dx > 0 ? 1 : -1);
        if (nc < 0 || nc >= KB_GRID[r].length) {
          soundManager.playBounceSound();
          return;
        }
        c = nc;
      } else if (dy !== 0) {
        const nr = r + (dy > 0 ? 1 : -1);
        if (nr < 0 || nr >= KB_GRID.length) {
          soundManager.playBounceSound();
          return;
        }
        r = nr;
        c = Math.min(c, KB_GRID[nr].length - 1);
      }
      editKbRef.current = { r, c };
      setEditKb({ r, c });
      soundManager.playNavigationSound();
      return;
    }
    // Settings page: ▲▼ between the member block and Sign Out.
    if (settingsOpenRef.current) {
      if (dy !== 0) {
        const nf = Math.min(Math.max(0, settingsFocusRef.current + (dy > 0 ? 1 : -1)), 1);
        if (nf !== settingsFocusRef.current) {
          settingsFocusRef.current = nf;
          setSettingsFocus(nf);
          soundManager.playNavigationSound();
        } else soundManager.playBounceSound();
      } else soundManager.playBounceSound();
      return;
    }
    // Switch Profile page: ◀▶ across profiles, ▲▼ between pick / edit.
    if (switchOpenRef.current) {
      let { col, row } = switchNavRef.current;
      if (dx !== 0) {
        const nc = col + (dx > 0 ? 1 : -1);
        if (nc < 0 || nc >= 4) {
          soundManager.playBounceSound();
          return;
        }
        col = nc;
      } else if (dy !== 0) {
        const nr = row + (dy > 0 ? 1 : -1);
        if (nr < 0 || nr > 1) {
          soundManager.playBounceSound();
          return;
        }
        row = nr as 0 | 1;
      }
      switchNavRef.current = { col, row };
      setSwitchNav({ col, row });
      soundManager.playNavigationSound();
      return;
    }
    // Profile dropdown: ▲▼ between items.
    if (profileMenuRef.current !== null) {
      if (dy !== 0) {
        const nf = Math.min(Math.max(0, profileMenuRef.current + (dy > 0 ? 1 : -1)), PROFILE_MENU.length - 1);
        if (nf !== profileMenuRef.current) {
          profileMenuRef.current = nf;
          setProfileMenu(nf);
          soundManager.playNavigationSound();
        } else soundManager.playBounceSound();
      } else soundManager.playBounceSound();
      return;
    }

    // Panel open: focus 0 = the screenshot area; 1..N = the action buttons
    // (signed-out hides Play). ▲▼ move between them; ◀▶ swaps screenshots while
    // the screenshot area is focused.
    const p = panelRef.current;
    if (p.game) {
      const actionCount = signedInRef.current ? PANEL_ACTIONS.length : PANEL_ACTIONS.length - 1;
      const focusCount = 1 + actionCount; // + the screenshot area
      if (dy !== 0) {
        const nf = Math.min(Math.max(0, p.focus + (dy > 0 ? 1 : -1)), focusCount - 1);
        if (nf !== p.focus) {
          const np = { ...p, focus: nf };
          panelRef.current = np;
          setPanel(np);
          soundManager.playNavigationSound();
        } else {
          soundManager.playBounceSound();
        }
      } else if (dx !== 0 && p.focus === 0) {
        // Swap screenshots (wraps); resetting panelShot restarts the countdown.
        setPanelShot((s) => (s + (dx > 0 ? 1 : -1) + SHOT_VARIANTS.length) % SHOT_VARIANTS.length);
        soundManager.playNavigationSound();
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

    // Top nav zone: ◀▶ move across tabs + the profile button, ▼ enters content.
    if (navFocusRef.current) {
      if (dx !== 0) {
        // Index TOP_NAV.length is the profile / sign-in button on the right.
        const nc = Math.min(Math.max(0, navColRef.current + (dx > 0 ? 1 : -1)), TOP_NAV.length);
        if (nc !== navColRef.current) {
          navColRef.current = nc;
          setNavCol(nc);
          soundManager.playNavigationSound();
        } else soundManager.playBounceSound();
      } else if (dy > 0) {
        enterContent();
      } else {
        soundManager.playBounceSound();
      }
      return;
    }

    // Search page: on-screen keyboard (left) + results grid (right).
    if (pageRef.current === 'search') {
      if (searchZoneRef.current === 'kb') {
        let { r, c } = kbRef.current;
        if (dx !== 0) {
          const nc = c + (dx > 0 ? 1 : -1);
          if (nc < 0) {
            soundManager.playBounceSound();
            return;
          }
          if (nc >= KB_GRID[r].length) {
            // Off the right edge → jump into the results grid, if any.
            if (resultChunksRef.current.length) {
              searchZoneRef.current = 'results';
              setSearchZone('results');
              resNavRef.current = { row: 0, col: 0 };
              setResNav({ row: 0, col: 0 });
              soundManager.playNavigationSound();
            } else soundManager.playBounceSound();
            return;
          }
          c = nc;
        } else if (dy !== 0) {
          const nr = r + (dy > 0 ? 1 : -1);
          if (nr < 0) {
            toNav();
            return;
          }
          if (nr >= KB_GRID.length) {
            soundManager.playBounceSound();
            return;
          }
          r = nr;
          c = Math.min(c, KB_GRID[nr].length - 1);
        }
        kbRef.current = { r, c };
        setKb({ r, c });
        soundManager.playNavigationSound();
        return;
      }
      // results zone
      const chunks = resultChunksRef.current;
      let { row, col } = resNavRef.current;
      if (dx !== 0) {
        const nc = col + (dx > 0 ? 1 : -1);
        if (nc < 0) {
          searchZoneRef.current = 'kb';
          setSearchZone('kb');
          soundManager.playNavigationSound();
          return;
        }
        if (nc >= (chunks[row]?.length ?? 0)) {
          soundManager.playBounceSound();
          return;
        }
        col = nc;
      } else if (dy !== 0) {
        const nr = row + (dy > 0 ? 1 : -1);
        if (nr < 0) {
          toNav();
          return;
        }
        if (nr >= chunks.length) {
          soundManager.playBounceSound();
          return;
        }
        row = nr;
        col = Math.min(col, (chunks[nr]?.length ?? 1) - 1);
      }
      resNavRef.current = { row, col };
      setResNav({ row, col });
      soundManager.playNavigationSound();
      return;
    }

    const prev = navRef.current;
    let next = prev;
    let sound: 'nav' | 'bounce' | null = null;

    const rows = navRowsRef.current;
    const sectionCount = rows.length + 1;

    // Puzzle row: navigate its inline answer options. The 2×2 grid (question) and
    // the two follow-up options are handled here; d-pad at a vertical edge (or on
    // the non-interactive result/thanks screens) falls through to leave the row.
    if (prev.sec > 0 && rows[prev.sec - 1]?.puzzle) {
      const stage = puzzleStageRef.current;
      const col = puzzleColRef.current;
      const setPz = (c: number) => {
        puzzleColRef.current = c;
        setPuzzleCol(c);
        soundManager.playNavigationSound();
      };
      if (dx !== 0) {
        if (stage === 'question') {
          const rowStart = col < 2 ? 0 : 2;
          const within = col - rowStart + (dx > 0 ? 1 : -1);
          if (within >= 0 && within <= 1) setPz(rowStart + within);
          else soundManager.playBounceSound();
        } else if (stage === 'followup') {
          const nc = col + (dx > 0 ? 1 : -1);
          if (nc >= 0 && nc <= 1) setPz(nc);
          else soundManager.playBounceSound();
        } else if (stage === 'thanks') {
          // Center-locked scroller: step the pool index; the track slides so the
          // focused tile stays centered. Clamp (bounce) at the ends.
          const nc = col + (dx > 0 ? 1 : -1);
          if (nc >= 0 && nc < RELATED_GAMES.length) setPz(nc);
          else soundManager.playBounceSound();
        } else soundManager.playBounceSound();
        return;
      }
      // Vertical inside the 2×2 question grid; otherwise leave the row.
      if (dy > 0 && stage === 'question' && col < 2) return void setPz(col + 2);
      if (dy < 0 && stage === 'question' && col >= 2) return void setPz(col - 2);
      // fall through: dy at an edge escapes to the adjacent section.
    }

    if (dx !== 0) {
      if (prev.sec === 0) {
        // Hero: ◀▶ move between CTAs (PLAY NOW / MORE INFO); at the edges,
        // cycle slides. Promo slides have a single CTA (maxCol 0).
        const count = heroSlideCountRef.current;
        const maxCol = isPromoSlideRef.current(prev.heroSlide) ? 0 : 1;
        // When cycling to an adjacent slide, keep the same CTA focused (clamped
        // to that slide's CTAs — the promo slide only has one).
        const slideCol = (ns: number) => Math.min(prev.col, isPromoSlideRef.current(ns) ? 0 : 1);
        if (dx > 0) {
          if (prev.col < maxCol) next = { ...prev, col: prev.col + 1 };
          else {
            const ns = (prev.heroSlide + 1) % count;
            next = { ...prev, heroSlide: ns, col: slideCol(ns) };
          }
        } else {
          if (prev.col > 0) next = { ...prev, col: prev.col - 1 };
          else {
            const ns = (prev.heroSlide - 1 + count) % count;
            next = { ...prev, heroSlide: ns, col: slideCol(ns) };
          }
        }
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
    } else if (dy < 0) {
      // Up: past the top of the content escalates to the top nav bar.
      const ns = prev.sec - 1;
      if (ns < (pageHasHeroRef.current ? 0 : 1)) {
        if (hasTopNavRef.current) {
          toNav();
          return;
        }
        sound = 'bounce';
      } else {
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
    } else if (dy > 0) {
      const ns = prev.sec + 1;
      if (ns >= sectionCount) sound = 'bounce';
      else {
        const targetRow = rows[ns - 1];
        const col = targetRow?.banner
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
  }, [toNav, enterContent]); // profile-overlay branches use refs + stable setters only

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
      // Full-screen screenshot carousel: Back closes it (panel stays behind).
      if (shotViewerOpenRef.current) {
        if (action === 'back') {
          shotViewerOpenRef.current = false;
          setShotViewerOpen(false);
          soundManager.playNavigationSound();
        }
        return;
      }
      // ── Profile overlays (highest priority) ──
      if (signOutConfirmRef.current) {
        if (action === 'back') closeSignOutConfirm();
        else if (action === 'ok') (signOutFocusRef.current === 1 ? doSignOut : closeSignOutConfirm)();
        return;
      }
      if (editingProfileRef.current !== null) {
        if (action === 'back') commitEdit();
        else if (action === 'ok') applyEditKey(KB_GRID[editKbRef.current.r][editKbRef.current.c]);
        return;
      }
      if (settingsOpenRef.current) {
        if (action === 'back') closeSettings();
        else if (action === 'ok' && settingsFocusRef.current === 1) openSignOutConfirm();
        return;
      }
      if (switchOpenRef.current) {
        if (action === 'back') closeSwitch();
        else if (action === 'ok') {
          const { col, row } = switchNavRef.current;
          if (row === 0) selectProfile(col);
          else startEdit(col);
        }
        return;
      }
      if (profileMenuRef.current !== null) {
        if (action === 'back') closeProfileMenu();
        else if (action === 'ok') (profileMenuRef.current === 0 ? openSettings : openSwitch)();
        return;
      }

      const p = panelRef.current;
      if (p.game) {
        if (action === 'back') {
          closePanel();
          return;
        }
        if (action === 'ok') {
          // Focus 0 is the screenshot area → open the full-screen carousel.
          // Actions are 1..N; signed-out panels hide Play so they shift up.
          if (p.focus === 0) {
            shotViewerOpenRef.current = true;
            setShotViewerOpen(true);
            soundManager.playSelectionSound();
            return;
          }
          const actions = signedInRef.current ? PANEL_ACTIONS : PANEL_ACTIONS.filter((a) => a !== 'play');
          const which = actions[p.focus - 1];
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
      // Top nav focused: OK switches page, or opens the profile button's action
      // (dropdown when signed in, sign-in upsell when signed out). Back is not
      // consumed here (the caller opens the exit menu / returns to the gallery).
      if (navFocusRef.current) {
        if (action === 'ok') {
          if (navColRef.current >= TOP_NAV.length) openProfile();
          else goToPage(TOP_NAV[navColRef.current].key);
        }
        return;
      }

      // Search page: OK types the focused key or launches the focused result;
      // Back steps results → keyboard → top nav.
      if (pageRef.current === 'search') {
        if (action === 'back') {
          if (searchZoneRef.current === 'results') {
            searchZoneRef.current = 'kb';
            setSearchZone('kb');
            soundManager.playNavigationSound();
          } else {
            toNav();
          }
          return;
        }
        if (searchZoneRef.current === 'kb') {
          applyKey(KB_GRID[kbRef.current.r][kbRef.current.c]);
        } else {
          const cur = resNavRef.current;
          const g = resultChunksRef.current[cur.row]?.[cur.col];
          if (g) {
            if (isV3Ref.current) launchGame(g);
            else openPanel(g);
          }
        }
        return;
      }

      // Home / My Games content.
      if (action === 'back') {
        if (!hasTopNavRef.current) return; // phase 0: not consumed (caller exits)
        // Escalate to the top: rows → top of content → top nav bar.
        const topSec = pageHasHeroRef.current ? 0 : 1;
        const cur = navRef.current;
        if (cur.sec > topSec) {
          const n = { ...cur, sec: topSec, col: 0 };
          navRef.current = n;
          setNav(n);
          soundManager.playNavigationSound();
        } else {
          toNav();
        }
        return;
      }
      // OK on the hero plays now; OK on a tile opens its panel (or launches in v3).
      if (action === 'ok') {
        const cur = navRef.current;
        if (cur.sec === 0) {
          // Game hero: col 1 = MORE INFO (side panel); col 0 = PLAY NOW. Promo
          // slide has a single CTA that opens the upsell (via launch).
          if (!isPromoSlideRef.current(cur.heroSlide) && cur.col === 1) openHeroInfo();
          else launch();
          return;
        }
        const row = navRowsRef.current[cur.sec - 1];
        if (row?.puzzle) {
          // Lock in the answer / follow-up choice; the result → follow-up → thanks
          // → dismiss timing is driven by effects keyed on the stage.
          const stage = puzzleStageRef.current;
          if (stage === 'question') {
            setPuzzleSel(puzzleColRef.current);
            puzzleStageRef.current = 'result';
            setPuzzleStage('result');
            soundManager.playSelectionSound();
          } else if (stage === 'followup') {
            setPuzzleFollowSel(puzzleColRef.current);
            puzzleColRef.current = RELATED_START; // center the promoted Song Quiz tile
            setPuzzleCol(RELATED_START);
            puzzleStageRef.current = 'thanks';
            setPuzzleStage('thanks');
            soundManager.playSelectionSound();
          } else if (stage === 'thanks') {
            // Launch the centered game directly (skip the game-info panel).
            const g = RELATED_GAMES[puzzleColRef.current] ?? SONG_QUIZ_GAME;
            if (g) launchGame(g);
          } else soundManager.playBounceSound();
          return;
        }
        if (row?.banner) {
          openUpsell(); // the free-trial banner opens the full-page upsell
          return;
        }
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
    [
      closePanel, closeAllGames, closeUpsell, openUpsell, openAllGames, launchGame, toggleFavorite, launch, openPanel,
      goToPage, applyKey, toNav, openHeroInfo, openProfile, closeProfileMenu, openSettings, closeSettings, openSwitch,
      closeSwitch, selectProfile, startEdit, commitEdit, applyEditKey, openSignOutConfirm, closeSignOutConfirm, doSignOut,
    ]
  );

  useImperativeHandle(
    ref,
    () => ({
      navigate,
      action: doAction,
      focusGame,
      isPanelOpen: () =>
        panelRef.current.game !== null || allGamesOpenRef.current || upsellOpenRef.current,
      // Whether the hub should consume a Back press (close a modal, or escalate
      // up toward the top nav) rather than the caller exiting. Focus on the top
      // nav bar itself is the top level, so Back there is not consumed.
      wantsBack: () =>
        panelRef.current.game !== null ||
        shotViewerOpenRef.current ||
        allGamesOpenRef.current ||
        upsellOpenRef.current ||
        profileMenuRef.current !== null ||
        settingsOpenRef.current ||
        switchOpenRef.current ||
        signOutConfirmRef.current ||
        editingProfileRef.current !== null ||
        (hasTopNavRef.current && !navFocusRef.current),
    }),
    [navigate, doAction, focusGame]
  );

  // Signing in removes the promo hero slide, so clamp the focused slide into
  // the new (smaller) range.
  useEffect(() => {
    setNav((n) => {
      if (n.heroSlide < heroSlideCount) return n;
      const ns = { ...n, heroSlide: heroSlideCount - 1, col: 0 };
      navRef.current = ns;
      return ns;
    });
  }, [heroSlideCount]);

  // Hero auto-advance while the hero is focused. A per-slide timeout (rather
  // than a fixed interval) so manual navigation resets the clock and the
  // active-dot countdown stays in sync.
  useEffect(() => {
    if (page !== 'home' || nav.sec !== 0 || reduceMotion || panel.game) return;
    const t = setTimeout(() => {
      setNav((p) => {
        const n = { ...p, heroSlide: (p.heroSlide + 1) % heroSlideCount, col: 0 };
        navRef.current = n;
        return n;
      });
    }, HERO_AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [page, nav.sec, nav.heroSlide, panel.game]);

  // Slideshow on a focused slideshow-tile: hold the cover art for 1s, then
  // start looping the game's screenshots.
  useEffect(() => {
    setShot(0);
    setSlideshowReady(false);
    if (nav.sec === 0 || reduceMotion) return;
    if (!navRowsRef.current[nav.sec - 1]?.slideshow) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const startT = setTimeout(() => {
      setSlideshowReady(true);
      interval = setInterval(() => setShot((s) => (s + 1) % SHOT_VARIANTS.length), 1500);
    }, 1000);
    return () => {
      clearTimeout(startT);
      if (interval) clearInterval(interval);
    };
  }, [nav.sec, nav.col]);

  // Slideshow inside the open game-info panel. Reset to the first shot on open.
  useEffect(() => {
    setPanelShot(0);
  }, [panel.game]);
  // Auto-advance per shot (keyed on panelShot so a manual ◀▶ swap resets the
  // countdown, matching the hero's per-slide timer + dot fill).
  useEffect(() => {
    if (!panel.game || reduceMotion) return;
    const t = setTimeout(() => setPanelShot((s) => (s + 1) % SHOT_VARIANTS.length), PANEL_SHOT_MS);
    return () => clearTimeout(t);
  }, [panel.game, panelShot]);

  // ── Puzzle row timing ──
  // Lyrics scroll one line at a time while the question is on screen.
  useEffect(() => {
    if (puzzleStage !== 'question' || reduceMotion) return;
    const t = setInterval(() => setPuzzleLyric((l) => (l + 1) % SONG_PUZZLE.lyrics.length), PUZZLE_LYRIC_MS);
    return () => clearInterval(t);
  }, [puzzleStage]);
  // Result holds briefly, then the follow-up question appears (focus reset to option 0).
  useEffect(() => {
    if (puzzleStage !== 'result') return;
    const t = setTimeout(() => {
      puzzleColRef.current = 0;
      setPuzzleCol(0);
      puzzleStageRef.current = 'followup';
      setPuzzleStage('followup');
    }, PUZZLE_ADVANCE_MS);
    return () => clearTimeout(t);
  }, [puzzleStage]);
  // "Thank you!" persists (no auto-dismiss) so the promoted Song Quiz tile stays
  // available to launch the full game.
  // When the puzzle row dismisses, keep the focus ring on the same visual row:
  // rows below the puzzle shift up by one, so nudge focus to match. Rows above
  // the puzzle are unaffected; a ring parked on the puzzle itself stays put and
  // lands on the row that slides up into its place.
  const puzzlePresentRef = useRef(showPuzzle);
  useEffect(() => {
    const wasPresent = puzzlePresentRef.current;
    puzzlePresentRef.current = showPuzzle;
    if (wasPresent === showPuzzle || pageRef.current !== 'home') return;
    const pIdx = puzzleSecRef.current;
    setNav((n) => {
      if (n.sec === 0) return n;
      let sec = n.sec;
      if (showPuzzle) {
        if (n.sec >= pIdx) sec = n.sec + 1; // row inserted at pIdx pushes it (and below) down
      } else if (n.sec > pIdx) {
        sec = n.sec - 1; // rows below the removed puzzle move up
      }
      sec = Math.max(1, Math.min(sec, navRowsRef.current.length));
      const row = navRowsRef.current[sec - 1];
      const col = Math.max(0, Math.min(n.col, (row?.games.length ?? 1) - 1));
      if (sec === n.sec && col === n.col) return n;
      const ns = { ...n, sec, col };
      navRef.current = ns;
      return ns;
    });
  }, [showPuzzle]);

  // Prototype: pressing "s" on the sign-in upsell simulates a successful sign-in
  // — flip the QR to a checked state and play the success sound.
  useEffect(() => {
    if (!upsellOpen) return;
    let holdT: ReturnType<typeof setTimeout> | undefined;
    let fadeT: ReturnType<typeof setTimeout> | undefined;
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 's' || e.key === 'S') && !signedInRef.current) {
        signedInRef.current = true;
        setSignedIn(true);
        setSignInDone(true);
        soundManager.playSuccessSound();
        // Hold the success checkmark ~1s, then fade the page out over 1.2s
        // before unmounting it.
        holdT = setTimeout(() => {
          setUpsellFading(true);
          fadeT = setTimeout(() => closeUpsell(), 1200);
        }, 1000);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (holdT) clearTimeout(holdT);
      if (fadeT) clearTimeout(fadeT);
    };
  }, [upsellOpen, closeUpsell]);

  // Keep Home focus on the same row when the "Jump Back On" row appears at the
  // top (after the first play), so the focus ring doesn't jump to a neighbor.
  const jumpBackPresentRef = useRef(homeJumpBack);
  useEffect(() => {
    const appeared = homeJumpBack !== jumpBackPresentRef.current;
    jumpBackPresentRef.current = homeJumpBack; // pure: update ref outside the setState updater
    if (!appeared || pageRef.current !== 'home') return;
    setNav((n) => {
      if (n.sec === 0) return n;
      const sec = Math.max(1, n.sec + (homeJumpBack ? 1 : -1));
      const row = navRowsRef.current[sec - 1];
      const col = Math.max(0, Math.min(n.col, (row?.games.length ?? 1) - 1));
      if (sec === n.sec && col === n.col) return n;
      const ns = { ...n, sec, col };
      navRef.current = ns;
      return ns;
    });
  }, [homeJumpBack]);

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
  // Layout effect (not a plain effect) so the incoming slide is marked
  // "transitioning" before the browser paints — otherwise it paints one frame at
  // full opacity (phase "idle") before the fade-in applies, causing a flash.
  useLayoutEffect(() => {
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
        const focusedHere = !navFocus && nav.sec === sectionIndex;

        // ── Free-trial promo banner (single full-width focusable item) ──
        if (s.kind === 'banner') {
          return (
            <div
              key="promo-banner"
              ref={(el) => (rowRefs.current[sectionIndex - 1] = el)}
              style={{ padding: `0 ${SHELF_PAD}px`, marginTop: 44 }}
            >
              <button
                onClick={() => {
                  focusSection(sectionIndex, 0);
                  openUpsell();
                }}
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
                {signedIn ? (
                  <>
                    {/* Mobile image (left) */}
                    <PhoneMock height={150} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.14em', color: '#b9babe' }}>
                        GAME CONTROLLER
                      </span>
                      <span style={{ fontSize: 46, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
                        Connect your phone as a game controller
                      </span>
                      <span style={{ fontSize: 22, color: 'rgba(243,244,241,0.72)' }}>
                        Scan the code to pair your phone and start playing.
                      </span>
                    </div>
                    {/* QR (right) */}
                    <div style={{ background: '#fff', padding: 12, borderRadius: 14, lineHeight: 0, flex: '0 0 auto' }}>
                      <QRCodeSVG value={mobileUrl} size={140} level="M" includeMargin={false} />
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </button>
            </div>
          );
        }

        // ── Puzzle row (inline song-quiz question) ──
        if (s.kind === 'puzzle') {
          const stage = puzzleStage;
          const correctIdx = SONG_PUZZLE.correct;
          const lyricCount = SONG_PUZZLE.lyrics.length;
          return (
            <div
              key="puzzle-row"
              ref={(el) => (rowRefs.current[sectionIndex - 1] = el)}
              style={{ padding: `0 ${SHELF_PAD}px`, marginTop: 52 }}
            >
              <div
                style={{
                  width: '100%',
                  minHeight: 300,
                  borderRadius: 20,
                  display: 'flex',
                  alignItems: 'stretch',
                  gap: 48,
                  padding: '34px 48px',
                  background: 'linear-gradient(100deg, #17181c 0%, #23242a 60%, #303138 100%)',
                  border: '1px solid #3a3b3f',
                  fontFamily: FONT,
                  color: INK,
                  overflow: 'hidden',
                }}
              >
                {/* Left: title + auto-scrolling lyrics */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
                  {/* Music icon in front of the SONG QUIZ / title block. */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 16 }}>
                    <div
                      style={{
                        flex: '0 0 auto',
                        width: 58,
                        height: 58,
                        borderRadius: '50%',
                        border: '1px solid #3a3b3f',
                        background: 'rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: reduceMotion ? undefined : 'puzzleNoteSpin 3.5s linear infinite',
                      }}
                    >
                      <IconMusic size={28} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.16em', color: '#b9babe' }}>
                        SONG QUIZ
                      </span>
                      <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>
                        {SONG_PUZZLE.title}
                      </span>
                    </div>
                  </div>
                  {/* Divider sets the title apart from the lyric block. */}
                  <div style={{ height: 1, background: '#3a3b3f', marginBottom: 20 }} />
                  {/* 3-line lyric window: current line solid, neighbors fade; the block
                      slides up on each line change (clipped to the viewport). */}
                  <div style={{ height: 124, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div
                      key={puzzleLyric}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        animation: reduceMotion ? undefined : 'puzzleLyricScroll 480ms cubic-bezier(.22,.61,.36,1)',
                      }}
                    >
                      {[-1, 0, 1].map((off) => {
                        const idx = ((puzzleLyric + off) % lyricCount + lyricCount) % lyricCount;
                        const isCur = off === 0;
                        return (
                          <div
                            key={off}
                            style={{
                              fontSize: isCur ? 30 : 23,
                              fontWeight: isCur ? 800 : 500,
                              fontStyle: 'italic',
                              opacity: isCur ? 1 : 0.24,
                              lineHeight: 1.32,
                              letterSpacing: '-0.01em',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {SONG_PUZZLE.lyrics[idx]}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right: answer options / result / follow-up / thanks */}
                <div style={{ flex: '0 0 auto', width: 820, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  {(stage === 'question' || stage === 'result') && (
                    <>
                      {stage === 'result' && (
                        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, letterSpacing: '-0.01em' }}>
                          {puzzleSel === correctIdx ? 'Correct!' : 'Not quite —'}{' '}
                          <span style={{ fontWeight: 600, color: INK_DIM }}>
                            {SONG_PUZZLE.options[correctIdx]} sings it.
                          </span>
                        </div>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {SONG_PUZZLE.options.map((opt, i) => {
                          const isFocus = focusedHere && stage === 'question' && puzzleCol === i;
                          const revealCorrect = stage === 'result' && i === correctIdx;
                          const revealWrong = stage === 'result' && i === puzzleSel && i !== correctIdx;
                          const dim = stage === 'result' && !revealCorrect && !revealWrong;
                          return (
                            <div
                              key={i}
                              style={{
                                minHeight: 78,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '20px 24px',
                                borderRadius: 14,
                                fontSize: 23,
                                fontWeight: 700,
                                letterSpacing: '-0.01em',
                                background: revealCorrect ? INK : '#1c1d21',
                                color: revealCorrect ? '#101114' : INK,
                                border: revealWrong ? '2px solid #fff' : '1px solid #3a3b3f',
                                opacity: dim ? 0.4 : 1,
                                boxShadow: isFocus ? '0 0 0 4px #fff' : 'none',
                                transform: isFocus ? 'scale(1.02)' : 'scale(1)',
                                transition: 'box-shadow 180ms ease, transform 180ms ease, opacity 300ms ease, background 300ms ease',
                              }}
                            >
                              {revealCorrect && <span style={{ fontWeight: 900 }}>✓</span>}
                              {revealWrong && <span style={{ fontWeight: 900 }}>✕</span>}
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt}</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {stage === 'followup' && (
                    <>
                      <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 20, letterSpacing: '-0.01em' }}>
                        {SONG_PUZZLE.followUp.question}
                      </div>
                      <div style={{ display: 'flex', gap: 16 }}>
                        {SONG_PUZZLE.followUp.options.map((opt, i) => {
                          const isFocus = focusedHere && puzzleCol === i;
                          return (
                            <div
                              key={i}
                              style={{
                                flex: 1,
                                minHeight: 78,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '20px 24px',
                                borderRadius: 14,
                                fontSize: 24,
                                fontWeight: 800,
                                letterSpacing: '-0.01em',
                                background: '#1c1d21',
                                color: INK,
                                border: '1px solid #3a3b3f',
                                boxShadow: isFocus ? '0 0 0 4px #fff' : 'none',
                                transform: isFocus ? 'scale(1.02)' : 'scale(1)',
                                transition: 'box-shadow 180ms ease, transform 180ms ease',
                              }}
                            >
                              {opt}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {stage === 'thanks' &&
                    (() => {
                      // Center-locked scroller: the whole pool is one track that
                      // slides so the focused tile stays centered; ◀▶ animate the
                      // movement. Neighbours peek in and are dimmed; a peeked tile
                      // click recenters it, the centered tile launches.
                      const TW = TILE.sm.w;
                      const GAP = 32;
                      const step = TW + GAP;
                      const VIEW_W = 820;
                      const FADE = 130; // edge fade width (px) on each side
                      const translateX = VIEW_W / 2 - TW / 2 - puzzleCol * step;
                      const edgeMask = `linear-gradient(to right, transparent 0, #000 ${FADE}px, #000 calc(100% - ${FADE}px), transparent 100%)`;
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em' }}>Play more on</div>
                          {/* Viewport clips the track; vertical padding (offset by a
                              negative margin) leaves room for the focus ring/shadow. */}
                          <div
                            style={{
                              width: VIEW_W,
                              overflow: 'hidden',
                              paddingTop: 60,
                              paddingBottom: 60,
                              marginTop: -60,
                              marginBottom: -60,
                              WebkitMaskImage: edgeMask,
                              maskImage: edgeMask,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                gap: GAP,
                                transform: `translateX(${translateX}px)`,
                                transition: reduceMotion
                                  ? undefined
                                  : 'transform 360ms cubic-bezier(.22,.61,.36,1)',
                              }}
                            >
                              {RELATED_GAMES.map((g, idx) => {
                                const isCenter = idx === puzzleCol;
                                return (
                                  <div
                                    key={g.id}
                                    style={{
                                      flex: '0 0 auto',
                                      opacity: isCenter ? 1 : 0.4,
                                      transition: 'opacity 240ms ease',
                                    }}
                                  >
                                    <Tile
                                      game={g}
                                      variant="sm"
                                      focused={isCenter && focusedHere}
                                      pressing={isCenter && pressing}
                                      slideshow={false}
                                      shot={0}
                                      onClick={() => {
                                        if (isCenter) launchGame(g);
                                        else {
                                          puzzleColRef.current = idx;
                                          setPuzzleCol(idx);
                                          soundManager.playNavigationSound();
                                        }
                                      }}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                </div>
              </div>
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
                    {s.gridTitle ?? 'All Games'}
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
                  slideshowReady={slideshowReady}
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
          {/* My Games — empty state: a centered nudge with featured game tiles. */}
          {page === 'mygames' && myGamesEmpty && (
            <div
              style={{
                height: STAGE_H,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 44,
                padding: `${NAV_BAR_H}px 60px 0`,
                boxSizing: 'border-box',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <h1 style={{ margin: 0, fontSize: 60, fontWeight: 800, letterSpacing: '-0.03em', color: INK }}>
                  Let’s play some games!
                </h1>
                <p style={{ margin: '16px 0 0', fontSize: 24, color: '#8a8a9a' }}>
                  Or find a game on Home and add it to your favorites.
                </p>
              </div>
              <div style={{ display: 'flex', gap: TILE.lg.gap, transform: 'scale(0.9)', transformOrigin: 'center' }}>
                {recommendedGames.map((g, i) => (
                  <Tile
                    key={g.id}
                    game={g}
                    variant="lg"
                    focused={!navFocus && nav.sec === 1 && nav.col === i}
                    pressing={pressing && !navFocus && nav.sec === 1 && nav.col === i}
                    slideshow
                    slideshowReady={slideshowReady}
                    shot={shot}
                    onClick={() => selectTile(1, i, g)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* My Games header (populated state; no hero on this page). */}
          {page === 'mygames' && !myGamesEmpty && (
            <div style={{ padding: `${NAV_BAR_H + 44}px ${SHELF_PAD}px 4px` }}>
              <h1 style={{ margin: 0, fontSize: 54, fontWeight: 800, letterSpacing: '-0.03em', color: INK }}>My Games</h1>
            </div>
          )}

          {/* Search page: query + on-screen alphabet keyboard + live results. */}
          {page === 'search' && (
            <SearchBody
              query={query}
              results={searchResults}
              resultChunks={resultChunks}
              cols={RESULTS_COLS}
              zone={searchZone}
              kb={kb}
              resNav={resNav}
              navFocus={navFocus}
              onKey={applyKey}
              onPickResult={(g) => (isV3 ? launchGame(g) : openPanel(g))}
            />
          )}

          {page === 'home' && (
          <>
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
              heroFocused={nav.sec === 0 && !navFocus}
              heroCol={nav.col}
              pressing={pressing}
              onPlay={handleHeroPlay}
              onMoreInfo={openHeroInfo}
            />
            {heroTransFrom !== null && (
              <HeroSlide
                key={`hero-out-${heroTransFrom}`}
                promo={isPromoSlide(heroTransFrom)}
                game={heroGameAt(heroTransFrom)}
                promoGames={HUB_CATALOG}
                trialUrl={trialUrl}
                phase="out"
                heroFocused={nav.sec === 0 && !navFocus}
                heroCol={nav.col}
                pressing={false}
                onPlay={handleHeroPlay}
                onMoreInfo={openHeroInfo}
              />
            )}

            {/* Brand wordmark — phase 1 shows it in the top nav bar instead. */}
            {!hasTopNav && (
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
            )}

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
                const countdown = active && nav.sec === 0 && !navFocus && !reduceMotion && !panel.game;
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
          </>
          )}

          {(page === 'home' || (page === 'mygames' && !myGamesEmpty)) && rowsContent}

          {/* My Games: favorites not started yet (but there is play history). */}
          {page === 'mygames' && !myGamesEmpty && favoriteGames.length === 0 && (
            <div style={{ padding: `40px ${SHELF_PAD}px 0` }}>
              <h2 style={{ margin: 0, fontSize: 32, fontWeight: 700, letterSpacing: '-0.01em', color: INK }}>Favorites</h2>
              <p style={{ margin: '12px 0 0', fontSize: 20, color: '#8a8a9a' }}>
                Find a game and add it to your favorites to keep it here.
              </p>
            </div>
          )}
        </div>

        {/* ── Top navigation bar (phase 1) — persistent over the page ── */}
        {hasTopNav && (
          <TopNav
            page={page}
            navFocus={navFocus}
            navCol={navCol}
            signedIn={signedIn}
            profileAvatar={profileAvatars[profileIdx]}
            profileName={profileNames[profileIdx]}
            profileMenu={profileMenu}
            pairCode={pairCode}
            onTab={goToPage}
            onProfile={openProfile}
            onMenuPick={(i) => (i === 0 ? openSettings() : openSwitch())}
          />
        )}

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
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: STAGE_BG,
              zIndex: 8,
              overflow: 'hidden',
              opacity: upsellFading ? 0 : 1,
              transition: 'opacity 1200ms ease',
            }}
          >
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
              <div
                style={{
                  position: 'relative',
                  width: 348,
                  height: 348,
                  background: '#fff',
                  padding: 24,
                  borderRadius: 24,
                  lineHeight: 0,
                  boxShadow: '0 30px 80px rgba(0,0,0,0.85), 0 8px 24px rgba(0,0,0,0.6)',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ opacity: signInDone ? 0 : 1, transition: 'opacity 400ms ease' }}>
                  <QRCodeSVG value={mobileUrl} size={300} level="M" includeMargin={false} />
                </div>
                {/* Checked state after a simulated sign-in. */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'grid',
                    placeItems: 'center',
                    opacity: signInDone ? 1 : 0,
                    transform: signInDone ? 'scale(1)' : 'scale(0.8)',
                    transition: 'opacity 400ms ease, transform 400ms cubic-bezier(.22,.61,.36,1)',
                  }}
                >
                  <svg width={160} height={160} viewBox="0 0 24 24" fill="none" stroke="#0a0b0d" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 12.5l2.5 2.5L16 9.5" />
                  </svg>
                </div>
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
              Press Back to return{!signedIn && ' · press S to simulate sign-in'}
            </div>
          </div>
        )}

        {/* ── Settings page ─────────────────────────────────────────── */}
        {settingsOpen && (
          <div style={{ position: 'absolute', inset: 0, background: STAGE_BG, zIndex: 9, overflow: 'hidden', fontFamily: FONT }}>
            <div style={{ padding: `72px ${SHELF_PAD}px 0` }}>
              <h1 style={{ margin: 0, fontSize: 54, fontWeight: 800, letterSpacing: '-0.03em', color: INK }}>Settings</h1>
              <div style={{ marginTop: 44, display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 900 }}>
                {/* Membership block (default focus) */}
                <div
                  style={{
                    padding: '30px 34px',
                    borderRadius: 18,
                    background: '#141518',
                    border: `1px solid ${settingsFocus === 0 ? '#fff' : '#2b2c30'}`,
                    boxShadow: settingsFocus === 0 ? '0 0 0 3px #fff' : 'none',
                    transition: 'box-shadow 160ms ease, border-color 160ms ease',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8a8a9a' }}>
                    Membership
                  </div>
                  <div style={{ marginTop: 10, fontSize: 34, fontWeight: 800, letterSpacing: '-0.01em', color: INK }}>
                    Free Trial
                  </div>
                  <div style={{ marginTop: 10, fontSize: 19, color: 'rgba(243,244,241,0.7)' }}>
                    Manage your subscription on account.weekend.com
                  </div>
                </div>
                {/* Sign out */}
                <button
                  onClick={openSignOutConfirm}
                  style={{
                    appearance: 'none',
                    alignSelf: 'flex-start',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '16px 30px',
                    borderRadius: 9999,
                    fontFamily: FONT,
                    fontSize: 20,
                    fontWeight: 700,
                    color: settingsFocus === 1 ? '#000' : INK,
                    background: settingsFocus === 1 ? INK : '#17181c',
                    border: `1px solid ${settingsFocus === 1 ? '#fff' : '#3a3b3f'}`,
                    boxShadow: settingsFocus === 1 ? '0 0 0 4px #fff' : 'none',
                    transition: 'all 160ms ease',
                  }}
                >
                  <IconX size={20} color={settingsFocus === 1 ? '#000' : INK} />
                  Sign Out from the TV
                </button>
              </div>
            </div>
            {/* Support QR — centered in the right column, up near the content top */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                right: 0,
                top: 260,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div style={{ background: '#fff', padding: 14, borderRadius: 16, lineHeight: 0 }}>
                <QRCodeSVG value="https://support.weekend.com" size={140} level="M" includeMargin={false} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: INK }}>Need help?</div>
                <div style={{ marginTop: 8, fontSize: 19, color: 'rgba(243,244,241,0.7)' }}>
                  Scan the QR code to get support.
                </div>
              </div>
            </div>
            <div style={{ position: 'absolute', left: SHELF_PAD, bottom: 44, fontSize: 18, color: '#8a8a9a' }}>
              Press Back to return
            </div>
          </div>
        )}

        {/* ── Switch Profile page ───────────────────────────────────── */}
        {switchOpen && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: STAGE_BG,
              zIndex: 9,
              overflow: 'hidden',
              fontFamily: FONT,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 56,
            }}
          >
            <h1 style={{ margin: 0, fontSize: 54, fontWeight: 800, letterSpacing: '-0.03em', color: INK }}>Who’s playing?</h1>
            <div style={{ display: 'flex', gap: 56 }}>
              {profileNames.map((name, i) => {
                const active = i === profileIdx;
                const pickFocused = switchNav.col === i && switchNav.row === 0;
                const editFocused = switchNav.col === i && switchNav.row === 1;
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
                    <button
                      onClick={() => selectProfile(i)}
                      style={{
                        appearance: 'none',
                        cursor: 'pointer',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        borderRadius: '50%',
                        transform: pickFocused ? 'scale(1.06)' : 'scale(1)',
                        boxShadow: pickFocused ? '0 0 0 5px #fff' : active ? '0 0 0 3px rgba(255,255,255,0.4)' : 'none',
                        transition: 'transform 180ms ease, box-shadow 180ms ease',
                      }}
                    >
                      <Avatar variant={profileAvatars[i]} size={180} />
                    </button>
                    <div style={{ fontSize: 26, fontWeight: 700, color: INK }}>{name}</div>
                    <button
                      onClick={() => startEdit(i)}
                      style={{
                        appearance: 'none',
                        cursor: 'pointer',
                        padding: '8px 18px',
                        borderRadius: 9999,
                        fontFamily: FONT,
                        fontSize: 15,
                        fontWeight: 700,
                        color: editFocused ? '#000' : '#b9babe',
                        background: editFocused ? INK : 'transparent',
                        border: `1px solid ${editFocused ? '#fff' : '#3a3b3f'}`,
                        boxShadow: editFocused ? '0 0 0 3px #fff' : 'none',
                        transition: 'all 160ms ease',
                      }}
                    >
                      Edit name
                    </button>
                  </div>
                );
              })}
            </div>
            <div style={{ position: 'absolute', bottom: 44, fontSize: 18, color: '#8a8a9a' }}>Press Back to return</div>
          </div>
        )}

        {/* ── Profile name editor (over Switch Profile) ─────────────── */}
        {editingProfile !== null && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(6,7,9,0.92)', zIndex: 14, display: 'grid', placeItems: 'center', fontFamily: FONT }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, width: 620 }}>
              <Avatar variant={profileAvatars[editingProfile]} size={120} />
              <div
                style={{
                  minWidth: 380,
                  textAlign: 'center',
                  paddingBottom: 10,
                  borderBottom: '2px solid #3a3b3f',
                  fontSize: 44,
                  fontWeight: 800,
                  color: editName ? INK : '#5c5d63',
                }}
              >
                {editName || 'Name'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {KB_GRID.map((rowKeys, r) => (
                  <div key={r} style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    {rowKeys.map((k, c) => {
                      const focused = editKb.r === r && editKb.c === c;
                      const wide = k.length > 1;
                      return (
                        <button
                          key={k}
                          onClick={() => applyEditKey(k)}
                          style={{
                            appearance: 'none',
                            cursor: 'pointer',
                            height: 54,
                            minWidth: wide ? 128 : 54,
                            padding: wide ? '0 16px' : 0,
                            borderRadius: 11,
                            fontFamily: FONT,
                            fontSize: wide ? 15 : 22,
                            fontWeight: 700,
                            color: focused ? '#000' : INK,
                            background: focused ? INK : '#17181c',
                            border: `1px solid ${focused ? '#fff' : '#2b2c30'}`,
                            boxShadow: focused ? '0 0 0 4px #fff' : 'none',
                            transition: 'all 140ms ease',
                          }}
                        >
                          {k === 'SPACE' ? 'SPACE' : k === 'DELETE' ? '⌫ DEL' : k === 'CLEAR' ? 'CLEAR' : k}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 17, color: '#8a8a9a' }}>Press Back to save</div>
            </div>
          </div>
        )}

        {/* ── Sign-out confirmation ─────────────────────────────────── */}
        {signOutConfirm && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(6,7,9,0.9)', zIndex: 14, display: 'grid', placeItems: 'center', fontFamily: FONT }}>
            <div style={{ width: 640, padding: '44px 48px', borderRadius: 24, background: '#0d0e10', border: '1px solid #26272b', textAlign: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 36, fontWeight: 800, letterSpacing: '-0.01em', color: INK }}>Sign out from this TV?</h2>
              <p style={{ margin: '14px 0 0', fontSize: 20, color: 'rgba(243,244,241,0.7)' }}>
                You’ll need to sign in again to play.
              </p>
              <div style={{ marginTop: 32, display: 'flex', gap: 16, justifyContent: 'center' }}>
                {['Cancel', 'Sign Out'].map((label, i) => {
                  const focused = signOutFocus === i;
                  return (
                    <button
                      key={label}
                      onClick={() => (i === 1 ? doSignOut() : closeSignOutConfirm())}
                      style={{
                        appearance: 'none',
                        cursor: 'pointer',
                        padding: '16px 34px',
                        borderRadius: 9999,
                        fontFamily: FONT,
                        fontSize: 20,
                        fontWeight: 700,
                        color: focused ? '#000' : INK,
                        background: focused ? INK : '#17181c',
                        border: `1px solid ${focused ? '#fff' : '#3a3b3f'}`,
                        boxShadow: focused ? '0 0 0 4px #fff' : 'none',
                        transition: 'all 160ms ease',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
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
                {/* Screenshots slideshow — focusable (◀▶ swaps shots) */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '16 / 9',
                    borderRadius: 14,
                    overflow: 'hidden',
                    flex: '0 0 auto',
                    background: '#141518',
                    boxShadow: panel.focus === 0 ? '0 0 0 4px #fff' : 'none',
                    transition: 'box-shadow 200ms ease',
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
                  {/* Dots + countdown, shown while the screenshot is focused. */}
                  {panel.focus === 0 && (
                    <>
                      <div
                        aria-hidden
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          bottom: 0,
                          height: 60,
                          background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 14,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          display: 'flex',
                          gap: 8,
                          alignItems: 'center',
                        }}
                      >
                        {SHOT_VARIANTS.map((_, i) => {
                          const active = i === panelShot;
                          return (
                            <span
                              key={i}
                              style={{
                                position: 'relative',
                                width: active ? 28 : 9,
                                height: 9,
                                borderRadius: 9999,
                                overflow: 'hidden',
                                background: 'rgba(255,255,255,0.4)',
                                transition: 'width 300ms ease',
                              }}
                            >
                              {active && (
                                <span
                                  key={panelShot}
                                  style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: '#fff',
                                    transformOrigin: 'left center',
                                    ...(reduceMotion
                                      ? { transform: 'scaleX(1)' }
                                      : { animation: `hubHeroDotFill ${PANEL_SHOT_MS}ms linear forwards` }),
                                  }}
                                />
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </>
                  )}
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
                  {signedIn ? (
                    <PanelButton
                      label="Play"
                      focused={panel.focus === 1}
                      pressing={pressing && panel.focus === 1}
                      onClick={() => {
                        const g = panelRef.current.game ?? panelGame;
                        closePanel();
                        launchGame(g);
                      }}
                    />
                  ) : (
                    // Signed out: no Play — pair your phone first. QR (left) +
                    // instruction (right).
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 48 }}>
                      <div style={{ background: '#fff', padding: 12, borderRadius: 14, lineHeight: 0, flex: '0 0 auto' }}>
                        <QRCodeSVG value={mobileUrl} size={168} level="M" includeMargin={false} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em', color: INK, lineHeight: 1.15 }}>
                          Scan, connect, and play!
                        </div>
                        <div style={{ fontSize: 19, lineHeight: 1.5, color: 'rgba(243,244,241,0.66)' }}>
                          Or, go to <b style={{ color: INK, fontWeight: 700 }}>pair.weekend.com</b>
                          <br />
                          and enter code <b style={{ color: INK, fontWeight: 700, letterSpacing: '0.04em' }}>{pairCode}</b>
                        </div>
                      </div>
                    </div>
                  )}
                  <PanelButton
                    label={favorites.has(panelGame.id) ? '♥  Favorited' : '♡  Add to Favorites'}
                    focused={panel.focus === (signedIn ? 2 : 1)}
                    onClick={() => toggleFavorite(panelGame.id)}
                  />
                  <PanelButton
                    label="Back to Lobby"
                    focused={panel.focus === (signedIn ? 3 : 2)}
                    onClick={closePanel}
                  />
                </div>
              </>
            )}
          </aside>
        </div>

        {/* ── Full-screen screenshot carousel (OK on the panel screenshot) ── */}
        {shotViewerOpen && panelGame && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 22,
              background: STAGE_BG,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 34,
              fontFamily: FONT,
            }}
          >
            <div
              style={{
                position: 'relative',
                width: 1660,
                aspectRatio: '16 / 9',
                borderRadius: 20,
                overflow: 'hidden',
                background: '#141518',
                boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
              }}
            >
              {SHOT_VARIANTS.map((v, i) => (
                <Screenshot
                  key={v}
                  game={panelGame}
                  variant={v}
                  style={{ position: 'absolute', inset: 0, opacity: i === panelShot ? 1 : 0, transition: 'opacity 500ms ease' }}
                />
              ))}
            </div>
            {/* Dots + countdown */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {SHOT_VARIANTS.map((_, i) => {
                const active = i === panelShot;
                return (
                  <span
                    key={i}
                    style={{
                      position: 'relative',
                      width: active ? 34 : 11,
                      height: 11,
                      borderRadius: 9999,
                      overflow: 'hidden',
                      background: 'rgba(255,255,255,0.32)',
                      transition: 'width 300ms ease',
                    }}
                  >
                    {active && (
                      <span
                        key={panelShot}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: '#fff',
                          transformOrigin: 'left center',
                          ...(reduceMotion
                            ? { transform: 'scaleX(1)' }
                            : { animation: `hubHeroDotFill ${PANEL_SHOT_MS}ms linear forwards` }),
                        }}
                      />
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}

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
            borderRadius: 16,
            background: 'linear-gradient(160deg, #2a2b2e 0%, #151517 42%, #0c0c0e 100%)',
            // Hairline outline on the frame's outer edge separates it from the page.
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow:
              '0 2px 0 rgba(255,255,255,0.06) inset, 0 -2px 0 rgba(0,0,0,0.6) inset, 0 40px 90px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.55)',
            position: 'relative',
          }}
        >
          {/* The screen: clips the scaled stage to rounded corners. A hairline
              ring (light outer, dark inner) delineates it from the bezel. */}
          <div
            style={{
              width: STAGE_W * scale,
              height: STAGE_H * scale,
              overflow: 'hidden',
              borderRadius: 6,
              background: '#000',
              boxShadow:
                '0 0 0 1px rgba(0,0,0,0.85), 0 0 0 2px rgba(255,255,255,0.12), 0 6px 20px rgba(0,0,0,0.55)',
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
          <GameLogo title={game.title} theme={game.theme} onDark style={{ fontSize: 80, whiteSpace: 'normal' }} />
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

// ── Wheel of Fortune hero wheel ──────────────────────────────────────────────
// Spins once (no loop) the first time the slide is focused, decelerating to rest
// with the jackpot at the top pointer, then pops the winning score. Until then it
// sits still (jackpot already at the pointer, since the spin is a whole # of turns).
function WofWheel({ focused }: { focused: boolean }) {
  const SIZE = 460;
  const C = SIZE / 2;
  const R = 205;
  const SEGMENTS = ['JACKPOT', '$400', '$800', '$650', '$350', '$900', '$500', '$750', '$600', '$450', '$850', '$700'];
  const n = SEGMENTS.length;
  const step = 360 / n;
  const pt = (r: number, deg: number): [number, number] => {
    const rad = (deg * Math.PI) / 180;
    return [C + r * Math.sin(rad), C - r * Math.cos(rad)];
  };
  // Latch the spin the first time the slide gains focus; never re-trigger.
  const [spun, setSpun] = useState(false);
  useEffect(() => {
    if (focused) setSpun(true);
  }, [focused]);
  const spinning = spun && !reduceMotion;
  return (
    <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{
          animation: spinning ? 'wofSpin 3.6s cubic-bezier(.16,.73,.12,1) forwards' : undefined,
          transformOrigin: 'center',
          filter: 'drop-shadow(0 24px 60px rgba(0,0,0,0.7))',
        }}
      >
        {SEGMENTS.map((val, k) => {
          const [x0, y0] = pt(R, k * step - step / 2);
          const [x1, y1] = pt(R, k * step + step / 2);
          const jackpot = k === 0;
          const fill = jackpot ? '#f3f4f1' : k % 2 === 0 ? '#3b3d44' : '#191a1e';
          const [tx, ty] = pt(R * 0.66, k * step);
          return (
            <g key={k}>
              <path
                d={`M ${C} ${C} L ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1} Z`}
                fill={fill}
                stroke="#0c0d10"
                strokeWidth={2}
              />
              <text
                x={tx}
                y={ty}
                fill={jackpot ? '#111' : '#e8e8e6'}
                fontSize={jackpot ? 16 : 15}
                fontWeight={jackpot ? 800 : 600}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily={FONT}
              >
                {val}
              </text>
            </g>
          );
        })}
        <circle cx={C} cy={C} r={R} fill="none" stroke="#000" strokeWidth={6} />
        <circle cx={C} cy={C} r={R + 9} fill="none" stroke="#4a4b52" strokeWidth={3} />
        {Array.from({ length: n }, (_, k) => {
          const [px, py] = pt(R, k * step - step / 2);
          return <circle key={k} cx={px} cy={py} r={4} fill="#d9d9d7" stroke="#000" strokeWidth={1} />;
        })}
        <circle cx={C} cy={C} r={34} fill="#111214" stroke="#4a4b52" strokeWidth={3} />
        <circle cx={C} cy={C} r={11} fill="#d9d9d7" />
      </svg>
      {/* Fixed pointer at the top (does not spin) */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -4,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '17px solid transparent',
          borderRight: '17px solid transparent',
          borderTop: '34px solid #f3f4f1',
          filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.6))',
          zIndex: 2,
        }}
      />
      {/* Winning score, revealed once the wheel has spun and settled. */}
      {spun && (
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
          <div
            style={{
              animation: reduceMotion ? undefined : 'wofScorePop 600ms cubic-bezier(.2,1.5,.4,1) 3.3s both',
              background: 'rgba(12,13,16,0.92)',
              border: '2px solid #f3f4f1',
              borderRadius: 16,
              padding: '10px 24px',
              color: INK,
              fontFamily: FONT,
              fontWeight: 800,
              fontSize: 42,
              letterSpacing: '-0.02em',
              boxShadow: '0 16px 44px rgba(0,0,0,0.7)',
              whiteSpace: 'nowrap',
            }}
          >
            $2,500
          </div>
        </div>
      )}
    </div>
  );
}

// ── Song Quiz "Party Mode" hero art ──────────────────────────────────────────
// Three players buzzing in head-to-head with a confetti burst — promotes the
// new Party Mode. Monochrome to match the hub (the real game is full-colour).
function SongQuizParty({ focused }: { focused: boolean }) {
  // Middle player leads; the others sit lower for a podium feel.
  const players = [
    { emoji: '😎', name: 'Max', score: 2, lift: 34 },
    { emoji: '🥳', name: 'Ava', score: 3, lift: 0, lead: true },
    { emoji: '🎤', name: 'Zoe', score: 1, lift: 48 },
  ];
  // Confetti at fixed spots (no RNG in this env); size + delay vary per piece.
  const confetti = [
    { left: 2, top: 4, s: 34, d: 0 },
    { left: 42, top: 0, s: 24, d: 0.7 },
    { left: 82, top: 8, s: 36, d: 0.3 },
    { left: 16, top: 66, s: 26, d: 1.0 },
    { left: 90, top: 52, s: 30, d: 0.5 },
    { left: 60, top: 72, s: 22, d: 1.2 },
    { left: 0, top: 40, s: 26, d: 0.2 },
    { left: 96, top: 26, s: 32, d: 0.9 },
  ];
  const emojis = ['🎉', '🎊', '✨', '🎵', '🎈', '🎉', '🎵', '✨'];
  return (
    <div style={{ position: 'absolute', right: 120, top: 40, width: 760, height: 520 }}>
      {/* Confetti scattered behind the players */}
      {confetti.map((c, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            position: 'absolute',
            left: `${c.left}%`,
            top: `${c.top}%`,
            fontSize: c.s,
            opacity: 0.5,
            animation: focused ? `sqConfetti 2.6s ease-in-out ${c.d}s infinite` : undefined,
          }}
        >
          {emojis[i % emojis.length]}
        </span>
      ))}
      {/* Three players buzzing in — the middle one leading the round */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 30,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          gap: 34,
        }}
      >
        {players.map((p, i) => (
          <div
            key={p.name}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
              // Custom prop drives the bob keyframe so each player keeps its lift.
              ['--bob-lift' as string]: `${p.lift}px`,
              transform: `translateY(${p.lift}px)`,
              animation: focused ? `sqPlayerBob 3s ease-in-out ${i * 0.25}s infinite` : undefined,
            }}
          >
            <div
              style={{
                position: 'relative',
                width: p.lead ? 208 : 168,
                height: p.lead ? 208 : 168,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.10)',
                border: p.lead ? '3px solid rgba(255,255,255,0.9)' : '2px solid rgba(255,255,255,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: p.lead ? 118 : 92,
                boxShadow: '0 16px 40px rgba(0,0,0,0.55)',
              }}
            >
              {p.emoji}
              {/* Buzzer light dot for the leader */}
              {p.lead && (
                <span
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: INK,
                    color: '#000',
                    fontSize: 18,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  }}
                >
                  ★
                </span>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 9999,
                background: 'rgba(20,21,24,0.85)',
                border: '1px solid rgba(255,255,255,0.25)',
                fontFamily: FONT,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 18, color: INK }}>{p.name}</span>
              <span style={{ fontSize: 16, color: '#9a9ba0' }}>🎤 {p.score}</span>
            </div>
          </div>
        ))}
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
  /** Focused CTA within the hero: 0 = PLAY NOW, 1 = MORE INFO (game slides). */
  heroCol: number;
  pressing: boolean;
  onPlay: () => void;
  onMoreInfo: () => void;
}

function HeroSlide({
  promo,
  game,
  promoGames = [],
  trialUrl = '',
  phase,
  heroFocused,
  heroCol,
  pressing,
  onPlay,
  onMoreInfo,
}: HeroSlideProps) {
  const isWof = !promo && game?.id === WOF_ID;
  const isSongQuiz = !promo && game?.id === 'song-quiz';
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
        ) : isWof ? (
          <>
            {/* Wheel of Fortune art: game backdrop + the spinning wheel on the right. */}
            {game && (
              <GameArt
                game={game}
                variant="hero"
                style={{ position: 'absolute', top: 0, left: 0, width: STAGE_W, height: 620 }}
              />
            )}
            <div style={{ position: 'absolute', right: 210, top: 300, transform: 'translateY(-50%)' }}>
              <WofWheel focused={heroFocused && phase !== 'out'} />
            </div>
          </>
        ) : isSongQuiz ? (
          <>
            {game && (
              <GameArt
                game={game}
                variant="hero"
                hideMotif
                style={{ position: 'absolute', top: 0, left: 0, width: STAGE_W, height: 620 }}
              />
            )}
            <SongQuizParty focused={heroFocused && phase !== 'out'} />
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
              <div style={{ maxWidth: 640, position: 'relative', display: 'inline-block' }}>
                <GameLogo title={game.title} theme={game.theme} onDark style={{ fontSize: 92, whiteSpace: 'normal' }} />
                {/* "NEW RELEASE" sticker pinned to the top-right edge of the title. */}
                {isWof && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -22,
                      right: -46,
                      transform: 'rotate(12deg)',
                      fontSize: 15,
                      fontWeight: 800,
                      letterSpacing: '0.14em',
                      color: '#111',
                      background: INK,
                      borderRadius: 8,
                      padding: '8px 16px',
                      boxShadow: '0 8px 22px rgba(0,0,0,0.55)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    NEW RELEASE
                  </span>
                )}
                {/* Song Quiz: "Party Mode" as a second title line with a NEW
                    tag beside it — promotes the new mode, not a new game. */}
                {isSongQuiz && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10 }}>
                    <GameLogo
                      title="Party Mode"
                      theme={game.theme}
                      onDark
                      style={{ fontSize: 58, whiteSpace: 'nowrap', color: game.theme?.accent }}
                    />
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        letterSpacing: '0.14em',
                        color: '#000',
                        background: INK,
                        borderRadius: 6,
                        padding: '5px 12px',
                        boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      NEW
                    </span>
                  </div>
                )}
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
                {isSongQuiz
                  ? 'Up to 4 friends go head-to-head to name the hit song first.'
                  : game.description}
              </p>
              <GameMetaPills players={game.players} interaction={game.interaction} size={42} />
            </>
          )
        )}
        <div style={{ marginTop: 6, display: 'flex', gap: 14 }}>
          {(() => {
            const ctaStyle = (btnFocused: boolean): CSSProperties => ({
              appearance: 'none',
              minWidth: 200,
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
              ...(btnFocused && selected
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
            });
            return promo ? (
              <button onClick={onPlay} style={ctaStyle(true)}>
                MORE INFO
              </button>
            ) : (
              <>
                <button onClick={onPlay} style={ctaStyle(heroCol === 0)}>
                  PLAY NOW
                </button>
                <button onClick={onMoreInfo} style={ctaStyle(heroCol === 1)}>
                  MORE INFO
                </button>
              </>
            );
          })()}
        </div>
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
  /** Slideshow only plays once ready (after the 1s focus delay). Default true. */
  slideshowReady?: boolean;
}

function Tile({ game, variant, focused, pressing, slideshow, shot, onClick, slideshowReady = true }: TileProps) {
  const t = TILE[variant];
  const showShots = slideshow && focused && slideshowReady;

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

      {/* Legibility scrim — only the featured (lg) tiles carry a caption, so the
          bottom fade is limited to them; regular tiles show clean art. */}
      {variant === 'lg' && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(0deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0) 55%)',
          }}
        />
      )}

      {/* Caption — the large featured (lg) tiles keep player count + description;
          regular game-row tiles (sm/grid) no longer show the player count. */}
      {variant === 'lg' && (
        <div style={captionStyle}>
          <span style={{ display: 'flex', gap: 10, alignItems: 'center', color: INK_DIM, fontSize: 20 }}>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{game.players}</span>
            <span style={{ color: '#8a8a9a' }}>• {game.description}</span>
          </span>
        </div>
      )}

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

function IconMusic({ size = 26, color = INK }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 17V4.5l10-2V15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6.4" cy="17" r="2.6" fill={color} />
      <circle cx="16.4" cy="15" r="2.6" fill={color} />
    </svg>
  );
}

// ── Top navigation (phase 1) ──────────────────────────────────────────────────
function IconSearch({ size = 22, color = INK }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
    </svg>
  );
}
function IconHome({ size = 22, color = INK }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9h14v-9" />
    </svg>
  );
}
function IconHeart({ size = 22, color = INK }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20s-7-4.6-9.2-9C1.3 8 2.6 5 5.6 5 7.6 5 9 6.3 12 9c3-2.7 4.4-4 6.4-4 3 0 4.3 3 2.8 6-2.2 4.4-9.2 9-9.2 9Z" />
    </svg>
  );
}
function IconX({ size = 20, color = INK }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}
// A stylized phone showing a game-controller UI, for the "connect your phone"
// banner (signed-in state).
function PhoneMock({ height = 150 }: { height?: number }) {
  const w = (height * 78) / 150;
  return (
    <svg width={w} height={height} viewBox="0 0 78 150" fill="none" style={{ flex: '0 0 auto' }}>
      <rect x="3" y="3" width="72" height="144" rx="16" fill="#0d0e10" stroke="#5a5b60" strokeWidth="2.5" />
      <rect x="11" y="15" width="56" height="112" rx="8" fill="#1c1d21" />
      {/* D-pad (left) */}
      <g fill="#e9eaec">
        <rect x="20" y="70" width="9" height="27" rx="2" />
        <rect x="11" y="79" width="27" height="9" rx="2" />
      </g>
      {/* Action buttons (right) */}
      <circle cx="52" cy="76" r="5" fill="#e9eaec" />
      <circle cx="60" cy="88" r="5" fill="#9a9ba0" />
      {/* Screen label dot row */}
      <rect x="19" y="26" width="40" height="6" rx="3" fill="#3a3b40" />
      {/* Home indicator */}
      <rect x="30" y="135" width="18" height="3" rx="1.5" fill="#5a5b60" />
    </svg>
  );
}

function IconGift({ size = 22, color = INK }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M5 12v8h14v-8" />
      <line x1="12" y1="8" x2="12" y2="20" />
      <path d="M12 8S10.5 4 8 4a2 2 0 0 0 0 4h4Z" />
      <path d="M12 8s1.5-4 4-4a2 2 0 0 1 0 4h-4Z" />
    </svg>
  );
}
const NAV_ICONS: Record<Page, (p: { size?: number; color?: string }) => JSX.Element> = {
  search: IconSearch,
  home: IconHome,
  mygames: IconHeart,
};

function TopNav({
  page,
  navFocus,
  navCol,
  signedIn,
  profileAvatar,
  profileName,
  profileMenu,
  pairCode,
  onTab,
  onProfile,
  onMenuPick,
}: {
  page: Page;
  navFocus: boolean;
  navCol: number;
  signedIn: boolean;
  profileAvatar: number;
  profileName: string;
  profileMenu: number | null;
  pairCode: string;
  onTab: (p: Page) => void;
  onProfile: () => void;
  onMenuPick: (i: number) => void;
}) {
  const profileFocused = navFocus && navCol === TOP_NAV.length;
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: STAGE_W,
        height: NAV_BAR_H,
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        gap: 36,
        padding: `0 ${SHELF_PAD}px`,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.4) 55%, transparent 100%)',
        fontFamily: FONT,
        // Recede when focus is in the page content: smaller + dimmer.
        opacity: navFocus ? 1 : 0.8,
        transition: 'opacity 240ms ease',
      }}
    >
      <div
        style={{
          fontWeight: 800,
          fontSize: 34,
          letterSpacing: '-0.02em',
          color: INK,
          marginRight: 6,
          transform: navFocus ? 'scale(1)' : 'scale(0.9)',
          transformOrigin: 'left center',
          transition: 'transform 240ms ease',
        }}
      >
        weekend
      </div>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          height: NAV_BAR_H,
          transform: navFocus ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.9)',
          transition: 'transform 240ms ease',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        {TOP_NAV.map((t, i) => {
          const active = t.key === page;
          const focused = navFocus && i === navCol;
          const Icon = NAV_ICONS[t.key];
          const fg = focused ? '#000' : INK;
          return (
            <button
              key={t.key}
              onClick={() => onTab(t.key)}
              style={{
                appearance: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                height: 52,
                padding: '0 22px',
                borderRadius: 9999,
                fontFamily: FONT,
                fontSize: 20,
                fontWeight: 700,
                color: fg,
                background: focused ? INK : active ? 'rgba(255,255,255,0.16)' : 'transparent',
                border: `1px solid ${active && !focused ? 'rgba(255,255,255,0.32)' : 'transparent'}`,
                boxShadow: focused ? '0 0 0 4px #fff, 0 12px 30px rgba(0,0,0,0.5)' : 'none',
                transition: 'background 200ms ease, color 200ms ease, box-shadow 200ms ease',
              }}
            >
              <Icon size={22} color={fg} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Profile / sign-in button (right), with its dropdown. */}
      <div
        style={{
          position: 'absolute',
          right: SHELF_PAD,
          top: 0,
          height: NAV_BAR_H,
          display: 'flex',
          alignItems: 'center',
          transform: navFocus ? 'scale(1)' : 'scale(0.9)',
          transformOrigin: 'right center',
          transition: 'transform 240ms ease',
        }}
      >
        <button
          onClick={onProfile}
          style={{
            appearance: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            height: 56,
            // Signed in: tight around the avatar (expand right for the name when
            // focused). Signed out: even padding on both sides.
            padding: signedIn ? (profileFocused ? '0 22px 0 6px' : '0 6px') : '0 26px',
            borderRadius: 9999,
            fontFamily: FONT,
            fontSize: 20,
            fontWeight: 700,
            color: profileFocused && !signedIn ? '#000' : INK,
            background: profileFocused ? (signedIn ? 'rgba(255,255,255,0.16)' : INK) : 'transparent',
            border: `1px solid ${profileFocused || !signedIn ? 'rgba(255,255,255,0.32)' : 'transparent'}`,
            boxShadow: profileFocused ? '0 0 0 4px #fff, 0 12px 30px rgba(0,0,0,0.5)' : 'none',
            transition: 'background 200ms ease, box-shadow 200ms ease, padding 200ms ease',
          }}
        >
          {signedIn ? (
            <>
              <Avatar variant={profileAvatar} size={44} />
              {profileFocused && <span style={{ color: INK }}>{profileName}</span>}
            </>
          ) : (
            <>
              <span
                style={{
                  display: 'inline-flex',
                  transformOrigin: 'bottom center',
                  animation: reduceMotion ? undefined : 'hubGiftWiggle 3s ease-in-out infinite',
                }}
              >
                <IconGift size={22} color={profileFocused ? '#000' : INK} />
              </span>
              <span>Claim Free Trial</span>
            </>
          )}
        </button>

        {/* Dropdown */}
        {profileMenu !== null && (
          <div
            style={{
              position: 'absolute',
              top: NAV_BAR_H - 8,
              right: 0,
              minWidth: 240,
              padding: 8,
              borderRadius: 16,
              background: '#0d0e10',
              border: '1px solid #26272b',
              boxShadow: '0 30px 70px rgba(0,0,0,0.7)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {PROFILE_MENU.map((label, i) => {
              const focused = profileMenu === i;
              return (
                <button
                  key={label}
                  onClick={() => onMenuPick(i)}
                  style={{
                    appearance: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    padding: '16px 18px',
                    borderRadius: 11,
                    fontFamily: FONT,
                    fontSize: 20,
                    fontWeight: 700,
                    color: focused ? '#000' : INK,
                    background: focused ? INK : 'transparent',
                    border: 'none',
                    transition: 'background 140ms ease, color 140ms ease',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Claim Free Trial focus popover: QR + pairing code */}
        {!signedIn && profileFocused && (
          <div
            style={{
              position: 'absolute',
              top: NAV_BAR_H - 6,
              right: 0,
              padding: 20,
              borderRadius: 18,
              background: '#0d0e10',
              border: '1px solid #26272b',
              boxShadow: '0 30px 70px rgba(0,0,0,0.7)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div style={{ background: '#fff', padding: 12, borderRadius: 12, lineHeight: 0 }}>
              <QRCodeSVG value={`https://pair.weekend.com/${pairCode}`} size={150} level="M" includeMargin={false} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#b9babe', letterSpacing: '0.01em' }}>
              pair.weekend.com/<span style={{ color: INK, fontWeight: 800 }}>{pairCode}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Circular profile avatar (prototype: mock character portraits) ─────────────
// A set of distinct playful faces, each on its own gradient. `variant` selects
// which one (profiles get a random variant assigned at launch).
const AVATAR_GRADS = [
  'linear-gradient(135deg,#e9eaec,#8a8b90)',
  'linear-gradient(135deg,#c7c8cc,#4f5056)',
  'linear-gradient(135deg,#b6b7bc,#3a3b40)',
  'linear-gradient(135deg,#dcdde1,#6f7076)',
  'linear-gradient(135deg,#f1f2f4,#9a9ba0)',
  'linear-gradient(135deg,#a9aab0,#2c2d32)',
];
const AVATAR_COUNT = 6;
const INK_DK = 'rgba(16,17,20,0.85)';

function avatarGlyph(variant: number) {
  switch (variant % AVATAR_COUNT) {
    case 0: // smiley
      return (
        <>
          <circle cx="9" cy="10" r="1.2" fill={INK_DK} />
          <circle cx="15" cy="10" r="1.2" fill={INK_DK} />
          <path d="M8 13.4c1.2 1.9 6.8 1.9 8 0" fill="none" stroke={INK_DK} strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
    case 1: // cool (sunglasses)
      return (
        <>
          <path d="M4.5 9.5h15" stroke={INK_DK} strokeWidth="1.6" strokeLinecap="round" />
          <rect x="6" y="9.3" width="4.6" height="3.8" rx="1.6" fill={INK_DK} />
          <rect x="13.4" y="9.3" width="4.6" height="3.8" rx="1.6" fill={INK_DK} />
          <path d="M9 15.6c1.2 1 4.8 1 6 0" fill="none" stroke={INK_DK} strokeWidth="1.6" strokeLinecap="round" />
        </>
      );
    case 2: // robot
      return (
        <>
          <line x1="12" y1="3.2" x2="12" y2="5.6" stroke={INK_DK} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="12" cy="2.8" r="1" fill={INK_DK} />
          <rect x="6" y="5.8" width="12" height="11" rx="2.6" fill="none" stroke={INK_DK} strokeWidth="1.8" />
          <circle cx="9.5" cy="10.4" r="1.2" fill={INK_DK} />
          <circle cx="14.5" cy="10.4" r="1.2" fill={INK_DK} />
          <path d="M9.5 13.8h5" stroke={INK_DK} strokeWidth="1.6" strokeLinecap="round" />
        </>
      );
    case 3: // cat
      return (
        <>
          <path d="M6.6 6l2 3.6M17.4 6l-2 3.6" fill="none" stroke={INK_DK} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="13" r="5.6" fill="none" stroke={INK_DK} strokeWidth="1.8" />
          <circle cx="10" cy="12.4" r="1" fill={INK_DK} />
          <circle cx="14" cy="12.4" r="1" fill={INK_DK} />
          <path d="M12 14.4v.9" stroke={INK_DK} strokeWidth="1.4" strokeLinecap="round" />
        </>
      );
    case 4: // ghost
      return (
        <>
          <path d="M6 18.5V11a6 6 0 0 1 12 0v7.5l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4Z" fill={INK_DK} />
          <circle cx="10" cy="11" r="1.15" fill="#f3f4f1" />
          <circle cx="14" cy="11" r="1.15" fill="#f3f4f1" />
        </>
      );
    default: // star
      return <path d="M12 3.8l2.5 5 5.5.8-4 3.9.95 5.5L12 16.4 7.05 19l.95-5.5-4-3.9 5.5-.8Z" fill={INK_DK} />;
  }
}

function Avatar({ variant, size = 52 }: { variant: number; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: AVATAR_GRADS[variant % AVATAR_COUNT],
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        flex: '0 0 auto',
      }}
    >
      <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24">
        {avatarGlyph(variant)}
      </svg>
    </div>
  );
}

// ── Search page body (query + on-screen alphabet keyboard + results) ──────────
function SearchBody({
  query,
  results,
  resultChunks,
  zone,
  kb,
  resNav,
  navFocus,
  onKey,
  onPickResult,
}: {
  query: string;
  results: HubGame[];
  resultChunks: HubGame[][];
  cols: number;
  zone: 'kb' | 'results';
  kb: { r: number; c: number };
  resNav: { row: number; col: number };
  navFocus: boolean;
  onKey: (key: string) => void;
  onPickResult: (g: HubGame) => void;
}) {
  const keyLabel = (k: string) => (k === 'SPACE' ? 'SPACE' : k === 'DELETE' ? '⌫ DEL' : k === 'CLEAR' ? 'CLEAR' : k);
  return (
    <div style={{ padding: `${NAV_BAR_H + 44}px ${SHELF_PAD}px 60px`, display: 'flex', gap: 56, minHeight: STAGE_H }}>
      {/* Left: query + keyboard */}
      <div style={{ width: 540, flex: '0 0 auto' }}>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.12em', color: '#8a8a9a', textTransform: 'uppercase' }}>
          Search
        </div>
        <div
          style={{
            marginTop: 14,
            minHeight: 66,
            paddingBottom: 8,
            borderBottom: '2px solid #3a3b3f',
            fontSize: 44,
            fontWeight: 700,
            color: query ? INK : '#5c5d63',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {query || 'Type to search…'}
        </div>
        <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {KB_GRID.map((rowKeys, r) => (
            <div key={r} style={{ display: 'flex', gap: 14 }}>
              {rowKeys.map((k, c) => {
                const focused = !navFocus && zone === 'kb' && kb.r === r && kb.c === c;
                const wide = k.length > 1;
                return (
                  <button
                    key={k}
                    onClick={() => onKey(k)}
                    style={{
                      appearance: 'none',
                      cursor: 'pointer',
                      height: 62,
                      minWidth: wide ? 148 : 62,
                      padding: wide ? '0 18px' : 0,
                      borderRadius: 12,
                      fontFamily: FONT,
                      fontSize: wide ? 17 : 25,
                      fontWeight: 700,
                      letterSpacing: wide ? '0.05em' : 0,
                      color: focused ? '#000' : INK,
                      background: focused ? INK : '#17181c',
                      border: `1px solid ${focused ? '#fff' : '#2b2c30'}`,
                      boxShadow: focused ? '0 0 0 4px #fff' : 'none',
                      transition: 'background 140ms ease, color 140ms ease, box-shadow 140ms ease',
                    }}
                  >
                    {keyLabel(k)}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Right: live results */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.12em', color: '#8a8a9a', textTransform: 'uppercase' }}>
          {query.trim() ? `${results.length} result${results.length === 1 ? '' : 's'}` : 'Results'}
        </div>
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: TILE.grid.gap }}>
          {resultChunks.map((rowGames, ri) => (
            <div key={ri} style={{ display: 'flex', gap: TILE.grid.gap }}>
              {rowGames.map((g, ci) => (
                <Tile
                  key={g.id}
                  game={g}
                  variant="grid"
                  focused={!navFocus && zone === 'results' && resNav.row === ri && resNav.col === ci}
                  pressing={false}
                  slideshow={false}
                  shot={0}
                  onClick={() => onPickResult(g)}
                />
              ))}
            </div>
          ))}
          {query.trim() && results.length === 0 && (
            <p style={{ fontSize: 22, color: '#8a8a9a' }}>No games match “{query.trim()}”.</p>
          )}
          {!query.trim() && <p style={{ fontSize: 22, color: '#8a8a9a' }}>Use the keyboard to find a game by name.</p>}
        </div>
      </div>
    </div>
  );
}
