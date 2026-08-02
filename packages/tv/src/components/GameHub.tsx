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
import { layout, space, tileHeight, gridTileWidth } from '@weekend/ui';
import { QRCodeSVG } from 'qrcode.react';
import { HUB_GAMES, type HubGame, type GameTheme } from '../prototype/hub/games';
import { GameArt } from '../prototype/hub/GameArt';
import { GameLogo } from '../prototype/hub/GameLogo';
import { GameMetaPills } from '../prototype/hub/MetadataPill';
import { ARCADE_THEME, MOCKUP_THEME, HubThemeContext, useHubTheme } from '../prototype/hub/hubTheme';
import { assetUrl } from '../utils/assetUrl';
import { Screenshot, SHOT_VARIANTS, gameShots, shotCount } from '../prototype/hub/Screenshot';
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
// DS secondary face, for playful accents (the free-trial hero's sticker tags).
const FONT_KARL = "'Karl ST', 'Weekend Repro', ui-sans-serif, system-ui, sans-serif";
// Weekend DS colors (from @weekend/ui / arcade-foundation tokens):
//   fg = Warm White #F3F4F1, dim = warm-white @ ~62%, surface = Midnight Blue
//   #0A0322. The curated hub renders these in full color; the procedural
//   B&W mockups desaturate them via the stage grayscale filter.
const INK = '#F3F4F1';
const INK_DIM = 'rgba(243,244,241,0.62)';
const STAGE_BG = '#0A0322';

const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Real Weekend brand wordmark (canary script logo) — exported from Figma
// (Game Preview Creation Kit, node 13802-17500), served from public/brand.
// Replaces the placeholder "weekend" text. Native art is 192×47; rendered at
// 48px tall, left-anchored to the given position.
const WEEKEND_LOGO_SRC = assetUrl('/brand/weekend-logo.svg');
// Brand wordmark. The `arcade` theme renders the real Canary logo asset; the
// `mockup` theme keeps the original plain "weekend" text.
function BrandMark({ left, top }: { left: number; top: number }) {
  const { brandLogo } = useHubTheme();
  if (brandLogo) {
    return (
      <img
        src={WEEKEND_LOGO_SRC}
        alt="Weekend"
        style={{
          position: 'absolute',
          left,
          top,
          height: 48,
          width: 'auto',
          display: 'block',
          filter: 'drop-shadow(0 2px 20px rgba(0,0,0,0.5))',
        }}
      />
    );
  }
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
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
  );
}

// DS action + focus colors (from @weekend/ui / arcade-foundation tokens). The
// DS primary/CTA is a Canary gradient on Midnight-Blue ink; the focus frame is
// a radial Limon→Sky gradient stroke with a Sky halo (mirrors @weekend/ui
// FOCUS_FRAME + the FocusableButton "focus" state). Applied for color only —
// sizes/shapes are unchanged.
const CANARY = '#FFDA0A';
const CANARY_300 = '#FFF09E';
const CTA_GRADIENT = `linear-gradient(180deg, ${CANARY_300} 0%, ${CANARY} 100%)`;
const CTA_GLOW = '0 5.533px 22.133px 0 rgba(255,228,1,0.35)';
// Focus ring: a subtle Canary gradient (light → base → deep canary) + Canary halo.
const FOCUS_STROKE = 'linear-gradient(150deg, #FFF09E 0%, #FFDA0A 52%, #D9B908 100%)';
const FOCUS_HALO = '0 0 22px 2px rgba(255,218,10,0.5)'; // Canary glow

// Ring-only mask (paints just the padding band, hollow center) — used for both
// the gap fill and the gradient stroke so neither covers the tile art.
const RING_MASK = {
  WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
  WebkitMaskComposite: 'xor',
  mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
  maskComposite: 'exclude',
} as const;

/**
 * Focus ring — two concentric bands floated OUTSIDE the focused element: an
 * inner Midnight-Blue `gap` band (a solid DS-bg spacer so the ring reads over
 * any tile art and hides the glow bleed) and a Canary gradient stroke. Both are
 * masked to their band only (hollow center), so the tile art is never covered.
 * Rendered outside the element's clip; pair with FOCUS_HALO for the glow.
 */
function FocusRing({ radius, width = 5, gap = 6 }: { radius: number; width?: number; gap?: number }) {
  const grow = gap + width;
  return (
    <>
      {/* Midnight-blue gap band (DS background) */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: -gap,
          borderRadius: radius + gap,
          padding: gap,
          background: STAGE_BG,
          ...RING_MASK,
          pointerEvents: 'none',
          zIndex: 4,
        }}
      />
      {/* Canary gradient stroke */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: -grow,
          borderRadius: radius + grow,
          padding: width,
          background: FOCUS_STROKE,
          ...RING_MASK,
          pointerEvents: 'none',
          zIndex: 5,
        }}
      />
    </>
  );
}

// ── Content model — edit these to mock new categories ──────────────────────
export type TileVariant = 'sm' | 'lg' | 'grid';
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
  /** Show a "NEW" tag on every tile in this row (e.g. freshly-added games). */
  newTag?: boolean;
  /** Prepend a "Create new game" tile as the first item (Studio "My games" row). */
  createTile?: boolean;
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
  /** Row starts with a "Create new game" tile (focusable at index 0; games shift +1). */
  createTile?: boolean;
}

/**
 * Effective focusable item count for a row: an optional leading Create tile, the
 * games, then an optional trailing See-all tile.
 */
const navRowLen = (r: NavRow) => (r.createTile ? 1 : 0) + r.games.length + (r.seeAll ? 1 : 0);

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

// "All Games" grid: every game in the catalog, GRID_COLS per row. The grid tile
// width fits exactly GRID_COLS tiles + gaps between the shared side gutters —
// derived from the shared @weekend/ui tokens so the Component Kit matches.
const ALL_GAMES = HUB_CATALOG;
const GRID_COLS = layout.gridCols;
const GRID_TILE_W = gridTileWidth();

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
  // Flagship classics (Jeopardy!, Wheel of Fortune, Song Quiz…) — sits above New on Weekend.
  { key: 'classic-weekend', title: 'Timeless Classics', variant: 'sm', slideshow: false, games: HUB_CATALOG.slice(0, 8), seeAll: true },
  // New on Weekend = freshly-added titles (NEW-tagged). Picked to avoid overlap
  // with the classics above and the "Games That Go Viral" row (catalog 8–11).
  { key: 'more', title: 'New on Weekend', variant: 'sm', slideshow: false, games: pick(15, 23, 12, 18, 13, 27, 28, 14), newTag: true },
  {
    key: 'community',
    title: 'Games That Go Viral',
    sub: "The games everyone's talking about right now",
    variant: 'lg',
    slideshow: true,
    games: HUB_CATALOG.slice(8, 12),
  },
  // Genre shelves (phase 1 / variation 1 only) — faked with catalog games.
  { key: 'fromtv', title: 'Weekend Classic', variant: 'sm', slideshow: false, games: pick(0, 3, 1, 16, 29, 4) },
  { key: 'party', title: 'Party Starters', variant: 'sm', slideshow: false, games: HUB_CATALOG.slice(12, 21) },
  { key: 'coop', title: 'Work Together', variant: 'sm', slideshow: false, games: pick(18, 19, 22, 8, 27, 24) },
  { key: 'family', title: 'Family Game Night', variant: 'sm', slideshow: false, games: pick(2, 9, 5, 12, 28, 13) },
  { key: 'popculture', title: 'Pop Culture', variant: 'sm', slideshow: false, games: pick(1, 16, 14, 25, 15, 26) },
  { key: 'brain', title: 'Brain Benders', variant: 'sm', slideshow: false, games: HUB_CATALOG.slice(21, 30) },
];

// Tile geometry per variant, derived from the shared @weekend/ui layout tokens
// so gap / radius / gutter are identical across every role (only tile *width*
// and the visible-tile count vary). Standard shelves and the grid share one
// width; featured rows use the 2x tile. `visible` counts are tuned so a chunk of
// the next tile (~2/3 on standard rows) always peeks past the stage edge as a
// "there's more" cue.
const TILE = {
  sm: { w: layout.tile.w, h: tileHeight(layout.tile.w), r: layout.tile.radius, gap: layout.shelfGap, visible: 4 },
  lg: { w: layout.tile.wFeatured, h: tileHeight(layout.tile.wFeatured), r: layout.tile.radius, gap: layout.shelfGap, visible: 2 },
  grid: { w: GRID_TILE_W, h: tileHeight(GRID_TILE_W), r: layout.tile.radius, gap: layout.shelfGap, visible: GRID_COLS },
} as const;

const SHELF_PAD = layout.shelfGutter;

// A game the user built in the Studio this session (in-memory only — cleared on
// TV reload). App passes these down so they appear as tiles in "My games".
export interface StudioCreatedGame {
  id: string;
  title: string;
  kind: string;
  idea: string;
}

// Per-kind tile theming for created games, so each looks distinct on the shelf.
const STUDIO_KIND_THEME: Record<string, GameTheme> = {
  trivia: { base: '#0c1533', from: '#182a6b', to: '#3f6ae0', accent: '#f7c948', pattern: 'grid', logo: 'block', motif: '🧠' },
  music: { base: '#1a0b3d', from: '#3a0f7a', to: '#7b2ff7', accent: '#3df5cf', pattern: 'bars', logo: 'block', motif: '🎵' },
  drawing: { base: '#241326', from: '#4a1550', to: '#c44eb0', accent: '#ff6ec7', pattern: 'sketch', logo: 'script', motif: '✏️' },
  word: { base: '#0f2a24', from: '#134a3a', to: '#1f9d7a', accent: '#ffd23f', pattern: 'grid', logo: 'block', motif: '🔤' },
  bluff: { base: '#20112e', from: '#3a1550', to: '#8a2fb0', accent: '#3df5cf', pattern: 'rays', logo: 'serif', motif: '🎭' },
};

function studioGameToHubGame(g: StudioCreatedGame): HubGame {
  return {
    id: g.id,
    title: g.title,
    description: g.idea,
    players: '1–4 Players',
    interaction: 'Voice Controlled',
    theme: STUDIO_KIND_THEME[g.kind] ?? STUDIO_KIND_THEME.trivia,
  };
}

// ── Top navigation (phase 1 only) ────────────────────────────────────────────
type Page = 'search' | 'home' | 'mygames' | 'studio';
type PuzzleStage = 'question' | 'result' | 'followup' | 'thanks' | 'done';
const NAV_BAR_H = 96;
const TOP_NAV: { key: Page; label: string }[] = [
  { key: 'search', label: 'Search' },
  { key: 'home', label: 'Home' },
  { key: 'mygames', label: 'My Games' },
  { key: 'studio', label: 'Studio' },
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

// Merch-hero geometry lives in the shared @weekend/ui tokens (layout.hero) so
// every prototype composes the same hero. The v3 top-preview height is separate.
const HERO_SECTION_H = layout.hero.sectionH;
const HERO_ART_H = layout.hero.artH;
const PREVIEW_H = 480;
// Exported "Top Game Preview" art is authored at this native size and rendered
// 1:1, right-anchored, in the 1920-wide band (see GameArt). Its left edge sits
// at STAGE_W − PREVIEW_IMG_W; the left fade goes fully solid up to that edge so
// the image blends in with no visible hard edge.
const PREVIEW_IMG_W = 1422;
const PREVIEW_IMG_EDGE_PCT = ((STAGE_W - PREVIEW_IMG_W) / STAGE_W) * 100; // ≈25.9%
// Left fade: opaque stage bg out to the image's left edge, then to transparent
// ~30% further right (over the image's left portion).
const HERO_LEFT_FADE = `linear-gradient(to right, ${STAGE_BG} 0%, ${STAGE_BG} ${PREVIEW_IMG_EDGE_PCT}%, transparent ${PREVIEW_IMG_EDGE_PCT + 30}%)`;
// Clearance below the v3 preview so a focused row's ring/scale isn't clipped.
const PREVIEW_GAP = 28;

// How long each hero slide stays before auto-advancing. The active dot fills
// over this same duration as a countdown.
const HERO_AUTOPLAY_MS = 6000;
// Any d-pad input suspends the hero countdown; it resumes once the user has been
// idle this long. Keeps the carousel from advancing out from under someone who is
// actively browsing the hero.
const HERO_IDLE_RESUME_MS = 1000;
// Per-shot dwell for the game-info panel's screenshot slideshow (+ dot countdown).
const PANEL_SHOT_MS = 2600;

// ── Full-page game detail geometry (@1x, of the 1920×1080 stage) ─────────────
// The screenshot carousel owns the top two-thirds: one large 16:9 centre shot
// with the previous / next shots peeking in from the gutters, faded back. Below
// it sit the copy column (left) and the action column (right).
const DETAIL = {
  /** Top inset of the carousel band. */
  top: space[8], // 48
  /** Centre screenshot — 16:9, sized so copy + actions still clear the bottom. */
  shotW: 1200,
  shotH: 675, // 1200 * 9 / 16
  /** Side shots render at this scale of the centre one, faded to `sideOpacity`. */
  sideScale: 0.78,
  sideOpacity: 0.32,
  /** Air between the centre shot and each side shot. */
  sideGap: space[6], // 32
  /** Carousel → dots, and dots → the copy/action band. */
  dotsGap: space[5], // 24
  bandGap: space[7], // 40
  /** Copy + actions band. Fixed height so the layout is stable across states. */
  bandH: 240,
  /** Action column width (buttons + the signed-out pairing block). */
  actionW: 520,
  /** Copy ↔ actions gutter. */
  colGap: space[9], // 64
} as const;
// Distance between two adjacent shot centres.
const DETAIL_STEP = DETAIL.shotW / 2 + (DETAIL.shotW * DETAIL.sideScale) / 2 + DETAIL.sideGap;
const DETAIL_BAND_TOP = DETAIL.top + DETAIL.shotH + DETAIL.dotsGap + 12 + DETAIL.bandGap;

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
/* Guess the Emoji hero: emoji glyphs drift up and down around the poster. */
@keyframes hubEmojiFloat {
  0%, 100% { transform: translateY(0) rotate(-4deg); }
  50%      { transform: translateY(-26px) rotate(4deg); }
}
/* Werds hero: the typed-answer caret blinks on each phone. */
@keyframes hubWerdsCaret { 50% { opacity: 0; } }
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
// Actions on the full-page game detail view. No "Back to Lobby" button — the
// page is dismissed with Back, so the two real actions carry the whole column.
const DETAIL_PAGE_ACTIONS = ['play', 'favorite'] as const;
/**
 * How the game detail is presented: the right-hand side panel (the original
 * treatment) or the full-screen detail page. Selected per-prototype and, in the
 * static demo, by the `?detail=` URL param.
 */
export type DetailView = 'sidebar' | 'page';

/**
 * Effective action list for a detail view: signed-out users can't play yet (they
 * get the pairing QR instead), so Play drops out of the focus order.
 */
function detailActions(view: DetailView, signedIn: boolean) {
  const base = view === 'page' ? DETAIL_PAGE_ACTIONS : PANEL_ACTIONS;
  return (signedIn ? base : base.filter((a) => a !== 'play')) as readonly string[];
}

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

/**
 * A curated home layout for a bespoke hub (e.g. the 9-game exploration). When
 * passed to GameHub via `content`, it drives a preview-mode home page — the hero
 * (free-trial promo + these game slides), the shelves and the grid — reusing all
 * the standard hub elements and behaviors, with no top nav (like phase-0 v3).
 */
export interface HubContent {
  /** Full catalog for this hub — feeds the promo montage, preview and search. */
  catalog: HubGame[];
  /** Hero game slides (the free-trial promo is prepended automatically). */
  heroGames: HubGame[];
  /**
   * Curated merch-hero slides (hub9): each a full-bleed creative background with
   * two game tiles overlaid and no CTA. When set, these replace `heroGames` as
   * the billboard carousel slides (after the free-trial promo).
   */
  heroMerch?: { key: string; bg: string; games: [string, string] }[];
  /** Shelves shown above the grid (standard sm rows). */
  shelves: { key: string; title: string; games: HubGame[] }[];
  /** The "All Games" grid (5 across). */
  grid: HubGame[];
  /** Game ids that show a NEW badge on their tile (any shelf/grid). */
  newIds?: string[];
}

interface GameHubProps {
  roomCode: string;
  /** Fired when the user presses OK on the hero CTA or a tile. */
  onLaunch: (game: HubGame) => void;
  /** Fired when the user presses OK on the Studio "Create new game" tile. */
  onCreateGame?: () => void;
  /** Games built this session, shown in the Studio "My games" row (temp cache). */
  createdGames?: StudioCreatedGame[];
  /** Which top-nav page to open on (mount). Defaults to Home. */
  initialPage?: Page;
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
  /**
   * Curated home content (a bespoke hub). When set, GameHub renders a preview-mode
   * home layout from it — reusing every standard element — with no top nav.
   */
  content?: HubContent;
  /**
   * How selecting a game presents its details: `sidebar` (the original right-hand
   * panel) or `page` (the full-screen detail page). Defaults to `sidebar`.
   *
   * `page` also means a curated/preview-mode hub (which normally launches on OK)
   * routes selection through the detail page instead.
   */
  detailView?: DetailView;
  /**
   * Start signed in (a subscriber). Off by default — signed-out users see the
   * pairing QR where Play would be. Lets a prototype without a sign-in surface
   * (the curated hub) still demo the subscribed state.
   */
  initialSignedIn?: boolean;
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
  {
    roomCode,
    onLaunch,
    onCreateGame,
    createdGames,
    initialPage,
    showPairing = false,
    phase = 1,
    variation = 1,
    frame = false,
    content,
    detailView = 'sidebar',
    initialSignedIn = false,
  },
  ref
) {
  // Full-page game detail instead of the side panel. Kept in a ref so the
  // imperative input handlers read the current mode without re-subscribing.
  const detailPage = detailView === 'page';
  const detailPageRef = useRef(detailPage);
  detailPageRef.current = detailPage;
  // Kept in a ref so the imperative OK handler (doAction) can fire it without
  // re-subscribing on every render.
  const onCreateGameRef = useRef(onCreateGame);
  onCreateGameRef.current = onCreateGame;
  // Curated-hub mode: a bespoke content set drives a preview-mode home page with
  // no top nav, reusing every standard element. Catalog + hero games fall back to
  // the built-in 30-game defaults when no content is provided.
  const customHub = !!content;
  // Curated hub (hub9) renders in the production `arcade` DS theme; every other
  // variation uses the low-fi `mockup` theme. Provided via context so the shared
  // hub components (HeroSlide / PreviewHero / Tile / pills / brand mark) pick it
  // up without prop-drilling.
  const theme = customHub ? ARCADE_THEME : MOCKUP_THEME;
  const catalog = content?.catalog ?? HUB_CATALOG;
  const heroGames = content?.heroGames ?? HERO_GAMES;
  const newIdSet = content?.newIds ? new Set(content.newIds) : null;
  const heroGamesRef = useRef(heroGames);
  heroGamesRef.current = heroGames;
  // Unknown values fall back to 1. Future phases/variations branch on these.
  const resolvedPhase = (HUB_PHASES as readonly number[]).includes(phase) ? phase : 1;
  const resolvedVariation = (HUB_VARIATIONS as readonly number[]).includes(variation) ? variation : 1;
  // "Preview mode" (variation 3, and phase-0 variation 1): keep the large hero
  // at section 0 but show a pinned game-info preview at the top while a tile is
  // focused, and launch directly on OK (no side panel). Phase 0 strips the hub
  // down to the All Games grid — variation 1 uses the top preview, variation 2
  // opens the game-info side panel on select instead. Kept in refs for input.
  // A curated hub always uses preview mode (like phase-0 v3).
  const isPhase0 = resolvedPhase === 0;
  const previewMode = customHub || resolvedVariation === 3 || (isPhase0 && resolvedVariation === 1);
  const isV3 = previewMode; // preview-mode behaviour (hero preview + direct launch)
  const isV3Ref = useRef(isV3);
  isV3Ref.current = isV3;

  // Profile / account (prototype pseudo-state). Default = signed out; the state
  // is in-memory only, so a hard refresh always returns to this logged-out state.
  const [signedIn, setSignedIn] = useState(initialSignedIn);

  // Free-trial promo as the first hero slide. Phase 0 and the curated hub always
  // show it; phase-1 variations show it only while signed out (signed-in users
  // have already claimed the trial).
  const showPromoSlide = isPhase0 || customHub ? true : !signedIn;
  const promoOffset = showPromoSlide ? 1 : 0;
  // Curated merch slides (hub9) replace the plain game slides as the carousel.
  const merchSlides = content?.heroMerch ?? null;
  const heroSlideCount = (merchSlides ? merchSlides.length : heroGames.length) + promoOffset;
  const isPromoSlide = (i: number) => showPromoSlide && i === 0;
  const heroGameAt = (i: number) => heroGames[i - promoOffset];
  /** The merch slide shown at carousel index `i` (undefined for the promo slide). */
  const merchAt = (i: number) => (merchSlides ? merchSlides[i - promoOffset] : undefined);
  const gameById = (id: string) => catalog.find((g) => g.id === id);
  const isPromoSlideRef = useRef(isPromoSlide);
  isPromoSlideRef.current = isPromoSlide;
  const heroSlideCountRef = useRef(heroSlideCount);
  heroSlideCountRef.current = heroSlideCount;
  const merchSlidesRef = useRef(merchSlides);
  merchSlidesRef.current = merchSlides;
  const promoOffsetRef = useRef(promoOffset);
  promoOffsetRef.current = promoOffset;
  const gameByIdRef = useRef(gameById);
  gameByIdRef.current = gameById;

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
  const hasTopNav = !isPhase0 && !customHub;
  const [page, setPage] = useState<Page>(initialPage ?? 'home');
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
  const gridGames = customHub ? content!.grid : isPhase0 ? HUB_CATALOG.slice(0, 12) : ALL_GAMES;
  const gridChunks = customHub || isPhase0 || resolvedVariation >= 2 ? chunk(gridGames, GRID_COLS) : [];
  // The full categorized shelf set (New on Weekend + Games That Go Viral + genre
  // rows) is used by phase-1 v1 and the new phase-0 v3; other variations trim to
  // just New on Weekend + Games That Go Viral. ("Jump Back On" is hidden here.)
  const fullShelfSet = resolvedVariation === 1 || (isPhase0 && resolvedVariation === 3);
  const visibleShelves = fullShelfSet
    ? ROWS.filter((r) => r.key !== 'jumpback')
    : ROWS.filter((r) => r.key === 'more' || r.key === 'community');

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
  const homeJumpBack = !isPhase0 && !customHub && jumpBackGames.length > 0;

  // Studio page (prototype): the user's created games (this session's temp cache)
  // and a grid of "all community games" (faked with the catalog for now).
  const myCreatedGames: HubGame[] = (createdGames ?? []).map(studioGameToHubGame);
  const communityGames = HUB_CATALOG;

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
  if (customHub) {
    // Curated hub: the configured shelves (e.g. "New Games") then the All Games
    // grid — standard sm shelves + grid, with the hero above and preview-on-focus.
    content!.shelves.forEach((sh) =>
      sections.push({
        kind: 'shelf',
        row: { key: sh.key, title: sh.title, variant: 'sm', slideshow: false, games: sh.games },
      })
    );
    gridChunks.forEach((games, gridIndex) =>
      sections.push({ kind: 'grid', games, gridIndex, gridTitle: gridIndex === 0 ? 'All Games' : undefined })
    );
  } else if (page === 'search') {
    // Search renders its own body (keyboard + results) — no scrolling sections.
  } else if (page === 'studio') {
    // Studio: a "My games" shelf led by the Create-new-game tile (then any
    // created games — none yet), and an "All community games" grid below.
    sections.push({
      kind: 'shelf',
      row: { key: 'my-games-studio', title: 'My games', variant: 'sm', slideshow: false, games: myCreatedGames, createTile: true },
    });
    chunk(communityGames, GRID_COLS).forEach((games, gridIndex) =>
      sections.push({ kind: 'grid', games, gridIndex, gridTitle: gridIndex === 0 ? 'All community games' : undefined })
    );
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
    if (resolvedVariation === 3) {
      // New phase-0 variation: categorized shelves + New on Weekend, no All
      // Games grid and no large "Games That Go Viral" row. New on Weekend gets
      // its own set of (newer) games with a NEW tag; the trial banner sits one
      // row further down, below "Weekend Classic" (the fromtv row).
      let bannerPlaced = false;
      visibleShelves
        .filter((row) => row.key !== 'community')
        .forEach((row) => {
          const shelf =
            row.key === 'more'
              ? { ...row, games: HUB_CATALOG.slice(8, 13), newTag: true, seeAll: true }
              : row;
          sections.push({ kind: 'shelf', row: shelf });
          if (row.key === 'fromtv') {
            sections.push({ kind: 'banner' });
            bannerPlaced = true;
          }
        });
      if (!bannerPlaced) sections.push({ kind: 'banner' });
    } else {
      gridChunks.forEach((games, gridIndex) => sections.push({ kind: 'grid', games, gridIndex }));
      sections.push({ kind: 'banner' });
    }
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
      return { games: s.row.games, variant: s.row.variant, slideshow: s.row.slideshow, seeAll: s.row.seeAll, createTile: s.row.createTile };
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

  const openPanel = useCallback((game: HubGame) => {
    // Focus 0 is the screenshot area; open with the first action focused instead.
    // On the detail page a non-subscriber has no Play button (just the pairing
    // QR), so there's nothing worth landing on — start on the carousel.
    const focus = detailPageRef.current && !signedInRef.current ? 0 : 1;
    const np = { game, focus };
    panelRef.current = np;
    setPanel(np);
    soundManager.playSelectionSound();
  }, []);

  const launch = useCallback(
    (autoDelay = 150) => {
      const cur = navRef.current;
      // MORE INFO on the promo hero slide opens the full-screen upsell page.
      if (cur.sec === 0 && isPromoSlideRef.current(cur.heroSlide)) {
        openUpsell();
        return;
      }
      // Curated merch slide: OK takes the focused tile's game (nav.col = tile) —
      // straight into it, or into its detail page when that variation is on.
      if (cur.sec === 0 && merchSlidesRef.current) {
        const slide = merchSlidesRef.current[cur.heroSlide - promoOffsetRef.current];
        const gid = slide?.games[cur.col] ?? slide?.games[0];
        const g = gid ? gameByIdRef.current(gid) : undefined;
        if (!g) return;
        if (detailPageRef.current) openPanel(g);
        else launchGame(g, autoDelay);
        return;
      }
      const game =
        cur.sec === 0
          ? heroGamesRef.current[cur.heroSlide - promoOffset]
          : navRowsRef.current[cur.sec - 1]?.games[cur.col];
      if (game) launchGame(game, autoDelay);
    },
    [launchGame, openUpsell, openPanel, promoOffset]
  );

  const closePanel = useCallback(() => {
    if (!panelRef.current.game) return;
    const np = { game: null, focus: 0 };
    panelRef.current = np;
    setPanel(np);
    shotViewerOpenRef.current = false;
    setShotViewerOpen(false);
    soundManager.playNavigationSound();
  }, []);

  /**
   * Selecting a game: preview-mode hubs launch straight into it, everything else
   * opens the game detail (side panel or full page). With the detail *page* on,
   * even a preview-mode hub routes through the detail view — that page is the
   * whole point of the variation.
   */
  const selectGame = useCallback(
    (game: HubGame) => {
      if (isV3Ref.current && !detailPageRef.current) launchGame(game);
      else openPanel(game);
    },
    [launchGame, openPanel]
  );

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
      selectGame(game);
    },
    [selectGame]
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
    if (p === 'mygames' || p === 'studio') {
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
    } else if (p === 'mygames' || p === 'studio') {
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

  // ── Hero autoplay: pause on input, resume on idle ──────────────────────────
  // Any d-pad input freezes the hero countdown (and its dot fill); after
  // HERO_IDLE_RESUME_MS of quiet it picks up where it left off. `heroCycle`
  // carries the time left in the current slide's countdown across those pauses
  // so the dot and the timer never drift apart.
  const [heroPaused, setHeroPaused] = useState(false);
  const heroCycleRef = useRef({ slide: -1, remain: HERO_AUTOPLAY_MS });
  const heroIdleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const nudgeHeroIdle = useCallback(() => {
    setHeroPaused(true);
    clearTimeout(heroIdleTimerRef.current);
    heroIdleTimerRef.current = setTimeout(() => setHeroPaused(false), HERO_IDLE_RESUME_MS);
  }, []);
  useEffect(() => () => clearTimeout(heroIdleTimerRef.current), []);

  const move = useCallback((dx: number, dy: number) => {
    nudgeHeroIdle();
    // Full-screen screenshot carousel: ◀▶ swap shots.
    if (shotViewerOpenRef.current) {
      if (dx !== 0) {
        const n = shotCount(panelRef.current.game);
        setPanelShot((s) => (s + (dx > 0 ? 1 : -1) + n) % n);
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
      const actionCount = detailActions(detailPageRef.current ? 'page' : 'sidebar', signedInRef.current).length;
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
        const n = shotCount(p.game);
        setPanelShot((s) => (s + (dx > 0 ? 1 : -1) + n) % n);
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
        const count = heroSlideCountRef.current;
        const merch = merchSlidesRef.current;
        if (merch) {
          // Merch carousel: ◀▶ toggles between a slide's two game tiles; at a
          // slide edge it crosses to the adjacent slide and lands on its FIRST
          // tile (col 0). The promo slide has a single focusable (its CTA).
          const s = prev.heroSlide;
          const c = prev.col;
          const isPromo = promoOffsetRef.current > 0 && s === 0;
          let ns = s;
          let nc = c;
          if (dx > 0) {
            if (!isPromo && c === 0) nc = 1; // within slide → 2nd tile
            else { ns = (s + 1) % count; nc = 0; } // cross → next slide, 1st tile
          } else {
            if (!isPromo && c === 1) nc = 0; // within slide → 1st tile
            else { ns = (s - 1 + count) % count; nc = 0; } // cross → prev slide, 1st tile
          }
          next = { ...prev, heroSlide: ns, col: nc };
        } else {
          // Plain hero: every slide has a single CTA, so ◀▶ just cycles slides.
          const ns = (prev.heroSlide + (dx > 0 ? 1 : -1) + count) % count;
          next = { ...prev, heroSlide: ns, col: 0 };
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
  }, [toNav, enterContent, nudgeHeroIdle]); // profile-overlay branches use refs + stable setters only

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
      const hIdx = heroGamesRef.current.findIndex((g) => g.id === id);
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
          const actions = detailActions(detailPageRef.current ? 'page' : 'sidebar', signedInRef.current);
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
          if (g) selectGame(g);
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
          // Hero has a single CTA: game slides PLAY NOW (launch), the promo slide
          // opens the upsell — both handled by launch().
          launch();
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
        // Studio "Create new game" tile sits at col 0 of its row.
        if (row?.createTile && cur.col === 0) {
          soundManager.playSelectionSound();
          onCreateGameRef.current?.();
          return;
        }
        const lead = row?.createTile ? 1 : 0;
        if (row?.seeAll && cur.col >= lead + row.games.length) {
          openAllGames(); // the trailing "See all games" tile
          return;
        }
        const g = row?.games[cur.col - lead];
        if (!g) return;
        selectGame(g); // variation 3 launches directly; otherwise open the detail
      }
    },
    [
      closePanel, closeAllGames, closeUpsell, openUpsell, openAllGames, launchGame, toggleFavorite, launch, openPanel,
      selectGame, goToPage, applyKey, toNav, openProfile, closeProfileMenu, openSettings, closeSettings, openSwitch,
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
  // active-dot countdown stays in sync. Input pauses the countdown (see
  // `nudgeHeroIdle`); the remaining time is banked and resumed once idle.
  useEffect(() => {
    if (page !== 'home' || nav.sec !== 0 || reduceMotion || panel.game) {
      // Leaving the hero abandons the countdown — it starts fresh on return.
      heroCycleRef.current = { slide: -1, remain: HERO_AUTOPLAY_MS };
      return;
    }
    const cycle = heroCycleRef.current;
    // A different slide is a brand-new countdown, however we got here.
    if (cycle.slide !== nav.heroSlide) {
      cycle.slide = nav.heroSlide;
      cycle.remain = HERO_AUTOPLAY_MS;
    }
    if (heroPaused) return;
    const startedAt = Date.now();
    let fired = false;
    const t = setTimeout(() => {
      fired = true;
      cycle.remain = HERO_AUTOPLAY_MS;
      setNav((p) => {
        const n = { ...p, heroSlide: (p.heroSlide + 1) % heroSlideCount, col: 0 };
        navRef.current = n;
        return n;
      });
    }, cycle.remain);
    // Bank the unspent time so a pause (or a re-render) doesn't restart the slide.
    return () => {
      clearTimeout(t);
      if (!fired) cycle.remain = Math.max(0, cycle.remain - (Date.now() - startedAt));
    };
  }, [page, nav.sec, nav.heroSlide, panel.game, heroPaused]);

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
  // countdown, matching the hero's per-slide timer + dot fill). The side panel's
  // thumbnail runs a quick loop; the detail page's carousel is a billboard, so it
  // borrows the merch hero's slower, pause-on-input cadence below.
  useEffect(() => {
    if (!panel.game || detailPage || reduceMotion) return;
    const n = shotCount(panel.game);
    const t = setTimeout(() => setPanelShot((s) => (s + 1) % n), PANEL_SHOT_MS);
    return () => clearTimeout(t);
  }, [panel.game, panelShot, detailPage]);

  // Detail-page carousel auto-scroll — the merch hero's behaviour exactly: a
  // per-shot timeout (so a manual ◀▶ restarts the clock in step with the dot
  // fill), suspended while the user is pressing keys and resumed from the banked
  // remainder once they've been idle for HERO_IDLE_RESUME_MS.
  const detailShotCycleRef = useRef({ shot: -1, remain: HERO_AUTOPLAY_MS });
  useEffect(() => {
    if (!panel.game || !detailPage || reduceMotion) {
      detailShotCycleRef.current = { shot: -1, remain: HERO_AUTOPLAY_MS };
      return;
    }
    const cycle = detailShotCycleRef.current;
    if (cycle.shot !== panelShot) {
      cycle.shot = panelShot;
      cycle.remain = HERO_AUTOPLAY_MS;
    }
    if (heroPaused) return;
    const startedAt = Date.now();
    let fired = false;
    const n = shotCount(panel.game);
    const t = setTimeout(() => {
      fired = true;
      cycle.remain = HERO_AUTOPLAY_MS;
      setPanelShot((s) => (s + 1) % n);
    }, cycle.remain);
    return () => {
      clearTimeout(t);
      if (!fired) cycle.remain = Math.max(0, cycle.remain - (Date.now() - startedAt));
    };
  }, [panel.game, panelShot, detailPage, heroPaused]);

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
    // Hero-less pages (Studio / My Games) have a page header (h1) tucked under the
    // top nav. Keep the first row at scrollY 0 so that header never scrolls up
    // into the "weekend" wordmark when returning to it.
    if (!pageHasHero && nav.sec === 1) {
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
  }, [nav.sec, isV3, pageHasHero]);

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
  // Resolve a merch slide's two game ids to catalog games (for HeroSlide tiles).
  const heroMerchGames = (m: { games: [string, string] } | undefined) =>
    m ? ([gameById(m.games[0]), gameById(m.games[1])] as (HubGame | undefined)[]) : undefined;
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
                      const GAP = layout.shelfGap;
                      const step = TW + GAP;
                      const VIEW_W = 820;
                      const FADE = layout.shelfFade; // edge fade width (px) on each side
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
                <div style={{ padding: `0 ${SHELF_PAD}px`, margin: `${si === 0 && pageHasHero ? 0 : layout.shelfRowGap}px 0 ${layout.shelfHeaderGap}px` }}>
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
                    badge={newIdSet?.has(game.id) ? 'NEW' : undefined}
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
        // Optional leading "Create new game" tile occupies col 0; games shift +1.
        const lead = row.createTile ? 1 : 0;
        const maxIdx = lead + row.games.length - 1 + (row.seeAll ? 1 : 0);
        const col = focusedHere ? nav.col : Math.min(colMemoryRef.current[sectionIndex] ?? 0, maxIdx);
        const step = t.w + t.gap;
        const trackX = -Math.max(0, col - (t.visible - 1)) * step;
        // Edge-fade "peek" affordance: the track never gets a trailing gutter,
        // so the next tile is always clipped by the stage — the fade turns that
        // clipped sliver into a "there's more ->" cue. Shown only when content
        // actually overflows that edge (leading fade appears once scrolled).
        const itemCount = lead + row.games.length + (row.seeAll ? 1 : 0);
        const contentW = SHELF_PAD + itemCount * t.w + (itemCount - 1) * t.gap;
        const hasTrailing = contentW + trackX > STAGE_W + 1;
        const hasLeading = trackX < 0;
        return (
          <section
            key={row.key}
            ref={(el) => (rowRefs.current[sectionIndex - 1] = el)}
            style={{ marginTop: si === 0 && pageHasHero ? 0 : layout.shelfRowGap, paddingBottom: 12 }}
          >
            <div style={{ padding: `0 ${SHELF_PAD}px`, marginBottom: layout.shelfHeaderGap }}>
              <h2 style={{ margin: 0, fontSize: 32, fontWeight: 700, letterSpacing: '-0.01em', color: INK }}>{row.title}</h2>
              {row.sub && <p style={{ margin: '10px 0 0', fontSize: 21, color: '#8a8a9a' }}>{row.sub}</p>}
            </div>
            <div style={{ position: 'relative', height: t.h }}>
              <div
                style={{
                  display: 'flex',
                  gap: t.gap,
                  paddingLeft: SHELF_PAD,
                  transform: `translateX(${trackX}px)`,
                  transition: 'transform 420ms cubic-bezier(.22,.61,.36,1)',
                }}
              >
                {row.createTile && (
                  <CreateGameTile
                    variant={row.variant}
                    focused={focusedHere && col === 0}
                    pressing={pressing && focusedHere && col === 0}
                    onClick={() => {
                      colMemoryRef.current[sectionIndex] = 0;
                      const n = { ...navRef.current, sec: sectionIndex, col: 0 };
                      navRef.current = n;
                      setNav(n);
                      soundManager.playSelectionSound();
                      onCreateGameRef.current?.();
                    }}
                  />
                )}
                {row.games.map((game, i) => (
                  <Tile
                    key={game.id}
                    game={game}
                    variant={row.variant}
                    focused={focusedHere && i + lead === col}
                    pressing={pressing && focusedHere && i + lead === col}
                    slideshow={row.slideshow}
                    slideshowReady={slideshowReady}
                    shot={shot}
                    badge={newIdSet?.has(game.id) || row.newTag ? 'NEW' : undefined}
                    onClick={() => selectTile(sectionIndex, i + lead, row.games[i])}
                  />
                ))}
                {row.seeAll && (
                  <SeeAllTile
                    variant={row.variant}
                    focused={focusedHere && col === lead + row.games.length}
                    onClick={() => {
                      colMemoryRef.current[sectionIndex] = lead + row.games.length;
                      const n = { ...navRef.current, sec: sectionIndex, col: lead + row.games.length };
                      navRef.current = n;
                      setNav(n);
                      openAllGames();
                    }}
                  />
                )}
              </div>
              {hasTrailing && (
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    right: 0,
                    width: layout.shelfFade,
                    pointerEvents: 'none',
                    background: `linear-gradient(to right, transparent, ${STAGE_BG})`,
                  }}
                />
              )}
              {hasLeading && (
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: layout.shelfFade,
                    pointerEvents: 'none',
                    background: `linear-gradient(to left, transparent, ${STAGE_BG})`,
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
          // B&W guarantee for the exploratory procedural mockups; a curated hub
          // (real exported color art) renders in full color for eye-checking.
          filter: theme.grayscale ? 'grayscale(1) contrast(1.03)' : undefined,
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
              {/* Recommended tiles are shrunk here only (scale wrapper) — this
                  does not change TILE.lg used by the large "viral" row. */}
              <div style={{ display: 'flex', gap: TILE.lg.gap, transform: 'scale(0.66)', transformOrigin: 'center' }}>
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

          {/* Studio header (no hero on this page). */}
          {page === 'studio' && (
            <div style={{ padding: `${NAV_BAR_H + 44}px ${SHELF_PAD}px 4px` }}>
              <h1 style={{ margin: 0, fontSize: 54, fontWeight: 800, letterSpacing: '-0.03em', color: INK }}>Studio</h1>
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
              onPickResult={selectGame}
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
              merch={merchAt(nav.heroSlide)}
              merchGames={heroMerchGames(merchAt(nav.heroSlide))}
              focusedTile={nav.col}
              promoGames={catalog}
              trialUrl={trialUrl}
              phase={heroTransFrom !== null ? 'in' : 'idle'}
              heroFocused={nav.sec === 0 && !navFocus}
              heroCol={nav.col}
              pressing={pressing}
              onPlay={handleHeroPlay}
            />
            {heroTransFrom !== null && (
              <HeroSlide
                key={`hero-out-${heroTransFrom}`}
                promo={isPromoSlide(heroTransFrom)}
                game={heroGameAt(heroTransFrom)}
                merch={merchAt(heroTransFrom)}
                merchGames={heroMerchGames(merchAt(heroTransFrom))}
                focusedTile={nav.col}
                promoGames={catalog}
                trialUrl={trialUrl}
                phase="out"
                heroFocused={nav.sec === 0 && !navFocus}
                heroCol={nav.col}
                pressing={false}
                onPlay={handleHeroPlay}
              />
            )}

            {/* Brand wordmark — phase 1 shows it in the top nav bar instead.
                DS (hub9) uses the real logo asset; other variations keep text. */}
            {!hasTopNav && <BrandMark left={SHELF_PAD} top={44} />}

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
                bottom: layout.hero.dotsBottom,
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
                          background: theme.dsAccent ? CANARY : INK,
                          transformOrigin: 'left center',
                          ...(countdown
                            ? {
                                animation: `hubHeroDotFill ${HERO_AUTOPLAY_MS}ms linear forwards`,
                                // Freeze mid-fill while input has the countdown
                                // paused; CSS holds the elapsed time for us, so it
                                // resumes in step with the banked timeout.
                                animationPlayState: heroPaused ? 'paused' : 'running',
                              }
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

          {(page === 'home' || (page === 'mygames' && !myGamesEmpty) || page === 'studio') && rowsContent}

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
            <TileMontage games={catalog} />
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(to right, ${STAGE_BG} 0%, ${STAGE_BG} 30%, transparent 62%)`,
              }}
            />
            {/* Weekend wordmark — real logo in DS mode (hub9), text otherwise. */}
            <BrandMark left={140} top={64} />
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

        {/* ── Game info side panel (detailView="sidebar") ─────────── */}
        {!detailPage && (
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
                  {gameShots(panelGame).map((s, i) => (
                    <Screenshot
                      key={s.key}
                      game={panelGame}
                      variant={s.variant}
                      src={s.src}
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
                        {gameShots(panelGame).map((s, i) => {
                          const active = i === panelShot;
                          return (
                            <span
                              key={s.key}
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
        )}

        {/* ── Game detail page (detailView="page") ────────────────── */}
        {detailPage && panelGame && (
          <GameDetailPage
            game={panelGame}
            open={!!panel.game}
            focus={panel.focus}
            shot={panelShot}
            shotPaused={heroPaused}
            signedIn={signedIn}
            favorited={favorites.has(panelGame.id)}
            mobileUrl={mobileUrl}
            pairCode={pairCode}
            pressing={pressing}
            onPickShot={setPanelShot}
            onOpenShots={() => {
              shotViewerOpenRef.current = true;
              setShotViewerOpen(true);
              soundManager.playSelectionSound();
            }}
            onPlay={() => {
              const g = panelRef.current.game ?? panelGame;
              closePanel();
              launchGame(g);
            }}
            onToggleFavorite={() => toggleFavorite(panelGame.id)}
            onClose={closePanel}
          />
        )}

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
              {gameShots(panelGame).map((s, i) => (
                <Screenshot
                  key={s.key}
                  game={panelGame}
                  variant={s.variant}
                  src={s.src}
                  style={{ position: 'absolute', inset: 0, opacity: i === panelShot ? 1 : 0, transition: 'opacity 500ms ease' }}
                />
              ))}
            </div>
            {/* Dots + countdown */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {gameShots(panelGame).map((s, i) => {
                const active = i === panelShot;
                return (
                  <span
                    key={s.key}
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
                            : {
                                // Match whichever cadence is driving the shots.
                                animation: `hubHeroDotFill ${detailPage ? HERO_AUTOPLAY_MS : PANEL_SHOT_MS}ms linear forwards`,
                                animationPlayState: detailPage && heroPaused ? 'paused' : 'running',
                              }),
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
    <HubThemeContext.Provider value={theme}>
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
    </HubThemeContext.Provider>
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

// ── Game detail page ─────────────────────────────────────────────────────────
// The full-screen alternative to the game-info side panel: a screenshot carousel
// filling the top of the stage (previous / next shots peeking in from the
// gutters, faded back) over a copy column and an action column.

/** Signed offset of shot `i` from the current one, wrapping the short way round. */
function shotOffset(i: number, current: number, count: number): number {
  const rel = (i - current + count) % count;
  return rel * 2 <= count ? rel : rel - count;
}

/**
 * Detail-page action button. DS pills: `primary` is the Canary gradient CTA,
 * `outline` a warm-white hairline. Focus adds the Canary gradient ring + halo,
 * the same treatment the game tiles use.
 */
function DetailButton({
  label,
  variant,
  focused,
  pressing,
  onClick,
}: {
  label: string;
  variant: 'primary' | 'outline';
  focused: boolean;
  pressing?: boolean;
  onClick: () => void;
}) {
  const primary = variant === 'primary';
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        appearance: 'none',
        width: '100%',
        height: 72,
        padding: '0 32px',
        borderRadius: 9999,
        cursor: 'pointer',
        fontFamily: FONT,
        fontSize: 26,
        fontWeight: 500,
        lineHeight: 1.2,
        color: primary ? STAGE_BG : INK,
        background: primary ? CTA_GRADIENT : 'transparent',
        border: primary ? 'none' : `1px solid rgba(243,244,241,0.20)`,
        transform: focused ? (pressing ? 'scale(0.98)' : 'scale(1.02)') : 'scale(1)',
        transition: 'transform 220ms cubic-bezier(.22,.61,.36,1), box-shadow 220ms ease, background 220ms ease',
        boxShadow: focused
          ? `${FOCUS_HALO}, 0 12px 30px rgba(0,0,0,0.5)`
          : primary
            ? `${CTA_GLOW}, 0 12px 30px rgba(0,0,0,0.5)`
            : 'none',
      }}
    >
      {focused && <FocusRing radius={9999} gap={6} width={5} />}
      {label}
    </button>
  );
}

export interface GameDetailPageProps {
  game: HubGame;
  /** False while the page is animating back out (the game is still rendered). */
  open: boolean;
  /** 0 = the screenshot carousel; 1..N = the action buttons. */
  focus: number;
  shot: number;
  /** Auto-scroll is suspended (recent input) — freeze the dot countdown too. */
  shotPaused: boolean;
  signedIn: boolean;
  favorited: boolean;
  mobileUrl: string;
  pairCode: string;
  pressing: boolean;
  onPickShot: (i: number) => void;
  onOpenShots: () => void;
  onPlay: () => void;
  onToggleFavorite: () => void;
  onClose: () => void;
}

export function GameDetailPage({
  game,
  open,
  focus,
  shot,
  shotPaused,
  signedIn,
  favorited,
  mobileUrl,
  pairCode,
  pressing,
  onPickShot,
  onOpenShots,
  onPlay,
  onToggleFavorite,
}: GameDetailPageProps) {
  const shotsFocused = focus === 0;
  // Signed out there's no Play button, so Favorite is the first action.
  const favoriteFocus = signedIn ? 2 : 1;
  const sideW = DETAIL.shotW * DETAIL.sideScale;
  // Real captures where the game has them, else the procedural mock frames.
  const shots = gameShots(game);

  return (
    <div
      style={{
        position: 'absolute',
        // 1px overscan (the stage clips it) so no hairline of the hub behind
        // survives the stage's fractional scale.
        inset: -1,
        zIndex: 20,
        background: STAGE_BG,
        fontFamily: FONT,
        color: INK,
        opacity: open ? 1 : 0,
        // Rises into place, so Back reads as dismissing a layer above the hub.
        transform: open ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 280ms ease, transform 320ms cubic-bezier(.22,.61,.36,1)',
        pointerEvents: open ? 'auto' : 'none',
        overflow: 'hidden',
      }}
    >
      {/* ── Screenshot carousel ── */}
      <div style={{ position: 'absolute', top: DETAIL.top, left: 0, width: STAGE_W, height: DETAIL.shotH }}>
        {shots.map((s, i) => {
          const off = shotOffset(i, shot, shots.length);
          const current = off === 0;
          // Only the current shot and its immediate neighbours are on stage.
          const onStage = Math.abs(off) <= 1;
          const w = current ? DETAIL.shotW : sideW;
          const h = (w * 9) / 16;
          return (
            <button
              key={s.key}
              onClick={() => (current ? onOpenShots() : onPickShot(i))}
              style={{
                position: 'absolute',
                top: (DETAIL.shotH - h) / 2,
                left: STAGE_W / 2 - w / 2 + off * DETAIL_STEP,
                width: w,
                height: h,
                appearance: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                background: '#141518',
                borderRadius: layout.tile.radius,
                opacity: onStage ? (current ? 1 : DETAIL.sideOpacity) : 0,
                transition:
                  'left 420ms cubic-bezier(.22,.61,.36,1), top 420ms cubic-bezier(.22,.61,.36,1), width 420ms cubic-bezier(.22,.61,.36,1), height 420ms cubic-bezier(.22,.61,.36,1), opacity 420ms ease, box-shadow 240ms ease',
                boxShadow: current
                  ? shotsFocused
                    ? `${FOCUS_HALO}, 0 30px 70px rgba(0,0,0,0.7)`
                    : '0 30px 70px rgba(0,0,0,0.6)'
                  : 'none',
                zIndex: current ? 2 : 1,
              }}
            >
              {current && shotsFocused && <FocusRing radius={layout.tile.radius} gap={6} width={5} />}
              {/* Inner clip so the focus ring floats outside the art. */}
              <div style={{ position: 'absolute', inset: 0, borderRadius: layout.tile.radius, overflow: 'hidden' }}>
                <Screenshot game={game} variant={s.variant} src={s.src} style={{ position: 'absolute', inset: 0 }} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Carousel dots — the active one fills as a countdown to the next
          auto-scroll, exactly like the merch hero's. */}
      <div
        style={{
          position: 'absolute',
          top: DETAIL.top + DETAIL.shotH + DETAIL.dotsGap,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}
      >
        {shots.map((s, i) => {
          const active = i === shot;
          return (
            <span
              key={s.key}
              style={{
                position: 'relative',
                width: active ? 36 : 12,
                height: 12,
                borderRadius: 9999,
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.28)',
                transition: 'width 300ms ease',
              }}
            >
              {active && (
                <span
                  // Remount on each shot so the fill restarts in lockstep with
                  // the auto-scroll timeout.
                  key={`fill-${shot}`}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 9999,
                    background: CANARY,
                    transformOrigin: 'left center',
                    ...(reduceMotion
                      ? { transform: 'scaleX(1)' }
                      : {
                          animation: `hubHeroDotFill ${HERO_AUTOPLAY_MS}ms linear forwards`,
                          animationPlayState: shotPaused ? 'paused' : 'running',
                        }),
                  }}
                />
              )}
            </span>
          );
        })}
      </div>

      {/* ── Copy (left) + actions (right) ── */}
      <div
        style={{
          position: 'absolute',
          top: DETAIL_BAND_TOP,
          left: SHELF_PAD,
          right: SHELF_PAD,
          height: DETAIL.bandH,
          display: 'flex',
          alignItems: 'flex-start',
          gap: DETAIL.colGap,
        }}
      >
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 style={{ margin: 0, fontSize: 52, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
            {game.title}
          </h1>
          <GameMetaPills players={game.players} interaction={game.interaction} size={40} />
          <p
            style={{
              margin: 0,
              maxWidth: 1080,
              fontSize: 24,
              lineHeight: 1.45,
              color: INK_DIM,
            }}
          >
            {game.description}
          </p>
        </div>

        <div
          style={{
            flex: `0 0 ${DETAIL.actionW}px`,
            width: DETAIL.actionW,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {signedIn ? (
            <DetailButton
              label="Play"
              variant="primary"
              focused={focus === 1}
              pressing={pressing && focus === 1}
              onClick={onPlay}
            />
          ) : (
            // Not a subscriber yet: pair a phone to start, so the QR takes the
            // primary slot. Not focusable — there's nothing to press.
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ background: '#fff', padding: 10, borderRadius: 12, lineHeight: 0, flex: '0 0 auto' }}>
                <QRCodeSVG value={mobileUrl} size={124} level="M" includeMargin={false} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.15 }}>
                  Scan, connect, and play!
                </div>
                <div style={{ fontSize: 18, lineHeight: 1.45, color: 'rgba(243,244,241,0.66)' }}>
                  Or, go to <b style={{ color: INK, fontWeight: 700 }}>pair.weekend.com</b>
                  <br />
                  and enter code <b style={{ color: INK, fontWeight: 700, letterSpacing: '0.04em' }}>{pairCode}</b>
                </div>
              </div>
            </div>
          )}
          <DetailButton
            label={favorited ? '♥  Favorited' : '♡  Add to Favorites'}
            variant="outline"
            focused={focus === favoriteFocus}
            pressing={pressing && focus === favoriteFocus}
            onClick={onToggleFavorite}
          />
        </div>
      </div>

      {/* Remote hint — Back leaves the page for wherever the user came from. */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: SHELF_PAD,
          fontSize: 16,
          color: 'rgba(243,244,241,0.38)',
        }}
      >
        ◀ ▶ screenshots · ▲ ▼ actions · Back to return
      </div>
    </div>
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

// ── Free-trial promo copy (Figma merch-hero spec) ────────────────────────────
// The promo hero's left column is positioned absolutely so it matches the Figma
// "screenshot_Free Trial — Merch Hero" frame 1:1 (Game Preview Creation Kit).
// The two headline lines set `line-height: 1`, so their CSS line-box top sits
// above the glyph ink by (fontAscent - inkAscent + halfLeading). These values
// back that offset out of the Figma ink bounds (380.5 / 457.9) using the real
// Weekend Repro metrics, so the rendered text lands on Figma's baseline grid.
const PROMO_X = 94;
const PROMO_TOP = { line1: 369.5, line2: 442, subtitle: 553.5, cta: 620 };

/**
 * The two tilted sticker badges heading the slide. Each is placed by the centre
 * of its rotated bounding box (for a rectangle the AABB centre *is* the rotated
 * rect's centre, so this is exact), then rotated about that centre. Figma's
 * rotation is counter-clockwise-positive, CSS's is clockwise-positive, so the
 * signs are inverted from the Figma values (+11.35° / -7.99°).
 */
const PROMO_STICKERS = [
  { label: 'WEEKEND', w: 201.2, h: 66, cx: 182.1, cy: 296.15, deg: -11.35, bg: '#95C8D3' },
  { label: 'PREMIUM', w: 190, h: 66, cx: 401.65, cy: 328.9, deg: 7.99, bg: '#EEA0EE' },
];
/** Canary → orange, left to right (the DS headline gradient). */
const PROMO_TITLE_GRADIENT = 'linear-gradient(90deg, #FFE84A 0%, #FB7928 100%)';
const PROMO_LINE: CSSProperties = {
  position: 'absolute',
  left: PROMO_X,
  lineHeight: 1,
  letterSpacing: '-1.6px',
  whiteSpace: 'nowrap',
  color: '#fff',
};

/** The tilted WEEKEND / PREMIUM sticker pair heading the free-trial slide. */
function PromoStickers() {
  return (
    <>
      {PROMO_STICKERS.map((s) => (
        <div
          key={s.label}
          style={{
            position: 'absolute',
            left: s.cx - s.w / 2,
            top: s.cy - s.h / 2,
            width: s.w,
            height: s.h,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 8,
            background: s.bg,
            transform: `rotate(${s.deg}deg)`,
          }}
        >
          <span
            style={{
              fontFamily: FONT_KARL,
              fontSize: 28,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: '2.1px',
              color: STAGE_BG,
            }}
          >
            {s.label}
          </span>
        </div>
      ))}
    </>
  );
}

// ── Preview hero (variation 3) ───────────────────────────────────────────────
// A pinned top band that mirrors the hero styling but reflects the focused
// game (no CTA, no carousel). Re-keyed by game id so it cross-fades on focus.
export interface PreviewHeroProps {
  game: HubGame;
  showPairing: boolean;
  roomCode: string;
  mobileUrl: string;
}

export function PreviewHero({ game, showPairing, roomCode, mobileUrl }: PreviewHeroProps) {
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
            background: HERO_LEFT_FADE,
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

      {/* Weekend wordmark (real brand logo) */}
      <BrandMark left={SHELF_PAD} top={44} />

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
          <GameLogo title={game.title} theme={game.theme} onDark src={game.art?.logo} style={{ fontSize: 80, whiteSpace: 'normal' }} />
        </div>
        <p
          style={{
            margin: 0,
            maxWidth: 760,
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
        <GameMetaPills players={game.players} interaction={game.interaction} />
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
    <div style={{ position: 'absolute', right: 120, top: (HERO_ART_H - 520) / 2, width: 760, height: 520 }}>
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

// ── Guess the Emoji hero art ─────────────────────────────────────────────────
// Emoji glyphs floating around the right side of the poster (per the brief).
const EMOJI_FLOATERS: { e: string; x: number; y: number; size: number; delay: number; dur: number }[] = [
  { e: '🎬', x: 60, y: 12, size: 118, delay: 0, dur: 7 },
  { e: '🍕', x: 82, y: 26, size: 96, delay: 1.2, dur: 8.5 },
  { e: '🐶', x: 70, y: 52, size: 104, delay: 0.6, dur: 6.5 },
  { e: '🌈', x: 90, y: 60, size: 90, delay: 2.1, dur: 9 },
  { e: '⚽', x: 56, y: 72, size: 82, delay: 1.6, dur: 7.5 },
  { e: '🚀', x: 76, y: 6, size: 78, delay: 0.3, dur: 8 },
  { e: '🎸', x: 94, y: 20, size: 86, delay: 2.6, dur: 7 },
  { e: '🦄', x: 64, y: 34, size: 98, delay: 1.9, dur: 8.2 },
  { e: '🍔', x: 88, y: 44, size: 82, delay: 0.9, dur: 6.8 },
  { e: '🎉', x: 74, y: 70, size: 92, delay: 2.3, dur: 9.4 },
];

function EmojiFloaters({ focused }: { focused: boolean }) {
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {EMOJI_FLOATERS.map((f, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: `${f.x}%`,
            top: `${f.y}%`,
            fontSize: f.size,
            lineHeight: 1,
            filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.45))',
            animation: focused && !reduceMotion ? `hubEmojiFloat ${f.dur}s ease-in-out ${f.delay}s infinite` : undefined,
          }}
        >
          {f.e}
        </span>
      ))}
    </div>
  );
}

// ── Werds hero art ───────────────────────────────────────────────────────────
// A TV showing a phrase puzzle, with 3 phones below running the on-screen
// keyboard (each with a hand on it) — a mock of the typing-game flow (per brief).
const WERDS_KB_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

function WerdsPhone({ tilt, hand, lift }: { tilt: number; hand: string; lift: number }) {
  return (
    <div
      style={{
        position: 'relative',
        width: 176,
        height: 292,
        transform: `translateY(${lift}px) rotate(${tilt}deg)`,
        borderRadius: 28,
        background: 'linear-gradient(160deg, #3a3b40 0%, #1a1b1f 100%)',
        border: '3px solid #45464c',
        boxShadow: '0 26px 44px rgba(0,0,0,0.55)',
        padding: 9,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 20, background: '#16241f', overflow: 'hidden' }}>
        {/* Answer field */}
        <div style={{ margin: '16px 12px 0', height: 34, borderRadius: 9, background: '#12211c', border: '1px solid #1f9d5744', display: 'flex', alignItems: 'center', padding: '0 10px', gap: 5 }}>
          <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 17, color: '#e9eaec', letterSpacing: '0.12em' }}>SPARK</span>
          <span style={{ width: 2, height: 18, background: '#fde047', animation: reduceMotion ? undefined : 'hubWerdsCaret 1s step-end infinite' }} />
        </div>
        {/* On-screen keyboard */}
        <div style={{ position: 'absolute', left: 7, right: 7, bottom: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {WERDS_KB_ROWS.map((row, r) => (
            <div key={r} style={{ display: 'flex', justifyContent: 'center', gap: 3 }}>
              {row.split('').map((k) => (
                <span
                  key={k}
                  style={{ flex: '1 1 0', maxWidth: 15, height: 22, borderRadius: 4, background: '#3b3d47', color: '#eceded', fontFamily: FONT, fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center' }}
                >
                  {k}
                </span>
              ))}
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 3 }}>
            <span style={{ flex: 1, height: 22, borderRadius: 4, background: '#3b3d47' }} />
            <span style={{ flex: 3, height: 22, borderRadius: 4, background: '#4a4c56' }} />
            <span style={{ flex: 1.4, height: 22, borderRadius: 4, background: '#1f9d57', color: '#04241a', fontFamily: FONT, fontSize: 9, fontWeight: 800, display: 'grid', placeItems: 'center' }}>GO</span>
          </div>
        </div>
      </div>
      {/* Hand on the glass */}
      <span aria-hidden style={{ position: 'absolute', right: -6, bottom: -10, fontSize: 66, transform: 'rotate(8deg)', filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.5))' }}>
        {hand}
      </span>
    </div>
  );
}

function WerdsTv() {
  // Phrase "BRIGHT SPARK" — some letters revealed, others blank tiles.
  const phrase = [
    ['B', 'R', 'I', 'G', 'H', 'T'],
    ['S', 'P', 'A', 'R', 'K'],
  ];
  const revealed = new Set(['B', 'T', 'S', 'K']);
  return (
    <div
      style={{
        width: 500,
        borderRadius: 16,
        background: 'linear-gradient(160deg, #1b1d22 0%, #0c0d10 100%)',
        border: '9px solid #17181c',
        boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
        padding: '20px 26px 24px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 16, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#fde047' }}>
        Phrase · Sunny words
      </div>
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 11 }}>
        {phrase.map((word, w) => (
          <div key={w} style={{ display: 'flex', gap: 7 }}>
            {word.map((ch, i) => {
              const on = revealed.has(ch) && !(w === 0 && ch === 'R' && i === 1);
              return (
                <span
                  key={i}
                  style={{
                    width: 46,
                    height: 56,
                    borderRadius: 7,
                    display: 'grid',
                    placeItems: 'center',
                    fontFamily: FONT,
                    fontWeight: 900,
                    fontSize: 30,
                    color: on ? '#0b0c0e' : 'rgba(255,255,255,0.25)',
                    background: on ? '#f3f4f1' : 'transparent',
                    border: on ? 'none' : '2px solid rgba(255,255,255,0.28)',
                  }}
                >
                  {on ? ch : ''}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function WerdsDevices() {
  return (
    <div style={{ position: 'absolute', right: 120, top: 24, width: 560, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <WerdsTv />
      <div style={{ display: 'flex', gap: 26, marginTop: 18 }}>
        <WerdsPhone tilt={-7} hand="👆" lift={20} />
        <WerdsPhone tilt={0} hand="✋" lift={0} />
        <WerdsPhone tilt={7} hand="👆" lift={20} />
      </div>
    </div>
  );
}

// ── Hero slide ───────────────────────────────────────────────────────────────
export type HeroPhase = 'idle' | 'in' | 'out';

export interface HeroSlideProps {
  /** Free-trial promo slide (panning tiles + QR) instead of a game. */
  promo?: boolean;
  game?: HubGame;
  /** Curated merch slide: full-bleed creative + 2 game tiles (hub9). */
  merch?: { key: string; bg: string; games: [string, string] };
  /** The two games for the merch slide, resolved to catalog entries. */
  merchGames?: (HubGame | undefined)[];
  /** Which merch tile is focused (0 | 1). */
  focusedTile?: number;
  /** Games to pan across the promo slide's art. */
  promoGames?: HubGame[];
  trialUrl?: string;
  phase: HeroPhase;
  /** Whether the hero section currently holds D-pad focus. */
  heroFocused: boolean;
  /** Focused CTA within the hero (single CTA per slide → always 0). */
  heroCol: number;
  pressing: boolean;
  onPlay: () => void;
}

export function HeroSlide({
  promo,
  game,
  merch,
  merchGames,
  focusedTile = 0,
  promoGames = [],
  trialUrl = '',
  phase,
  heroFocused,
  heroCol,
  pressing,
  onPlay,
}: HeroSlideProps) {
  const { dsAccent } = useHubTheme();
  const isWof = !promo && game?.id === WOF_ID;
  const isSongQuiz = !promo && game?.id === 'song-quiz';
  // Bespoke posters for the two new games (per the brief).
  const isEmoji = !promo && game?.id === 'guess-the-emoji';
  const isWerds = !promo && game?.id === 'werds';
  // Real exported preview art carries the full scene, so the procedural focal
  // overlays (spinning wheel, floaters, devices, party) are suppressed in favor
  // of the raster art below.
  const hasHeroArt = !promo && !!game?.art?.preview;
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

  // ── Curated merch slide (hub9) ─────────────────────────────────────────────
  // A full-bleed creative (photo + headline + subtitle + baked-in left fade,
  // exported from the Figma [EDIT THIS] frame) with two navigable game tiles
  // overlaid — no CTA button. The Weekend logo + carousel dots are stage chrome.
  if (merch) {
    const tiles = merchGames ?? [];
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: STAGE_W,
          height: HERO_SECTION_H,
          pointerEvents: phase === 'out' ? 'none' : undefined,
        }}
      >
        {/* Creative background (slides on carousel change). */}
        <div style={{ position: 'absolute', inset: 0, animation: artAnim }}>
          <img
            src={merch.bg}
            alt=""
            aria-hidden
            style={{ position: 'absolute', top: 0, left: 0, width: STAGE_W, height: HERO_SECTION_H, objectFit: 'cover', display: 'block' }}
          />
          {/* Bottom fade → blends the billboard into the rows below. Opaque to the
              very bottom edge (bottom:-1, solid to 8%) so no hairline leaks. */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: -1,
              height: 220,
              background: `linear-gradient(to top, ${STAGE_BG} 0%, ${STAGE_BG} 8%, transparent 100%)`,
            }}
          />
        </div>
        {/* Two game tiles — filmstrip focus; OK launches the focused one. */}
        <div style={{ position: 'absolute', inset: 0, animation: contentAnim }}>
          {[0, 1].map((i) => {
            const g = tiles[i];
            if (!g) return null;
            const focused = heroFocused && focusedTile === i && phase !== 'out';
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: i === 0 ? 94 : 397,
                  top: 569,
                  width: 254,
                  height: 143,
                  transform: focused ? (pressing ? 'scale(0.98)' : 'scale(1.06)') : 'scale(1)',
                  boxShadow: focused ? `${FOCUS_HALO}, 0 26px 60px rgba(0,0,0,0.7)` : 'none',
                  transition: 'transform 240ms cubic-bezier(.22,.61,.36,1), box-shadow 240ms ease',
                  zIndex: focused ? 3 : 1,
                  borderRadius: 16,
                }}
              >
                {focused && <FocusRing radius={16} gap={6} width={5} />}
                <div style={{ position: 'absolute', inset: 0, borderRadius: 16, overflow: 'hidden' }}>
                  <GameArt game={g} variant="tile" hideMotif style={{ position: 'absolute', inset: 0 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: STAGE_W,
        height: HERO_SECTION_H,
        pointerEvents: phase === 'out' ? 'none' : undefined,
      }}
    >
      {/* Art + fades (this is what slides left on the way out) */}
      <div style={{ position: 'absolute', inset: 0, animation: artAnim }}>
        {promo ? (
          <>
            {/* Panning montage — tilted multi-row wall of game tiles. */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HERO_ART_H, overflow: 'hidden' }}>
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
                style={{ position: 'absolute', top: 0, left: 0, width: STAGE_W, height: HERO_ART_H }}
              />
            )}
            {!hasHeroArt && (
              <div style={{ position: 'absolute', right: 210, top: HERO_ART_H / 2, transform: 'translateY(-50%)' }}>
                <WofWheel focused={heroFocused && phase !== 'out'} />
              </div>
            )}
          </>
        ) : isSongQuiz ? (
          <>
            {game && (
              <GameArt
                game={game}
                variant="hero"
                hideMotif
                style={{ position: 'absolute', top: 0, left: 0, width: STAGE_W, height: HERO_ART_H }}
              />
            )}
            {!hasHeroArt && <SongQuizParty focused={heroFocused && phase !== 'out'} />}
          </>
        ) : isEmoji || isWerds ? (
          // New-game posters: themed backdrop; the focal art (floating emojis /
          // Werds devices) is layered on top of the fades below so it stays crisp.
          game && (
            <GameArt
              game={game}
              variant="hero"
              hideMotif
              style={{ position: 'absolute', top: 0, left: 0, width: STAGE_W, height: HERO_ART_H }}
            />
          )
        ) : (
          game && (
            <GameArt
              game={game}
              variant="hero"
              style={{ position: 'absolute', top: 0, left: 0, width: STAGE_W, height: HERO_ART_H }}
            />
          )
        )}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: HERO_LEFT_FADE,
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            // Extend 1px past the art band and hold solid bg for the bottom ~6%
            // so the montage's hard clip edge never leaks a hairline under the fade.
            height: HERO_ART_H + 1,
            background: `linear-gradient(to top, ${STAGE_BG} 0%, ${STAGE_BG} 6%, transparent 46%)`,
          }}
        />
        {/* Focal poster art for the new games — over the fades so it stays crisp. */}
        {isEmoji && !hasHeroArt && <EmojiFloaters focused={heroFocused && phase !== 'out'} />}
        {isWerds && !hasHeroArt && <WerdsDevices />}
      </div>

      {/* ── Free-trial promo copy ──────────────────────────────────────────────
          Absolute geometry lifted from the Figma merch-hero frame ("Game Preview
          Creation Kit" → screenshot_Free Trial — Merch Hero): everything sits on
          the x=94 line (bar the tilted stickers), the headline lines at 381 / 459,
          subtitle at 553 and the CTA at 620 (all @1x of the 900px hero band).
          Game slides keep the shared bottom-anchored flex column below. */}
      {promo ? (
        <div style={{ position: 'absolute', inset: 0, animation: contentAnim, fontFamily: FONT }}>
          <PromoStickers />
          <span style={{ ...PROMO_LINE, top: PROMO_TOP.line1, fontWeight: 400, fontSize: 65 }}>
            Unlimited access to
          </span>
          <span
            style={{
              ...PROMO_LINE,
              top: PROMO_TOP.line2,
              fontWeight: 700,
              fontSize: 96,
              background: PROMO_TITLE_GRADIENT,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            All Games
          </span>
          <p
            style={{
              position: 'absolute',
              left: PROMO_X,
              top: PROMO_TOP.subtitle,
              margin: 0,
              fontSize: 26,
              lineHeight: 1.35,
              whiteSpace: 'nowrap',
              color: 'rgba(243,244,241,0.82)',
            }}
          >
            Scan and start your unlimited fun.
          </p>
          <button
            onClick={onPlay}
            style={{
              position: 'absolute',
              left: PROMO_X,
              top: PROMO_TOP.cta,
              appearance: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              height: 56,
              padding: '0 24px',
              border: 'none',
              borderRadius: 9999,
              cursor: 'pointer',
              fontFamily: FONT,
              fontSize: 24,
              fontWeight: 500,
              lineHeight: 1.2,
              color: STAGE_BG,
              background: CTA_GRADIENT,
              boxShadow: `${CTA_GLOW}, 0 12px 30px rgba(0,0,0,0.5)`,
              transform: pressing ? 'scale(0.96)' : 'scale(1)',
              transition: 'transform 220ms cubic-bezier(.22,.61,.36,1)',
            }}
          >
            Claim your free week
          </button>
        </div>
      ) : (
      <div
        style={{
          position: 'absolute',
          left: SHELF_PAD,
          bottom: layout.hero.contentBottom,
          width: 820,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 26,
          animation: contentAnim,
        }}
      >
        {(
          game && (
            <>
              <div style={{ maxWidth: game.art?.logo ? 720 : isEmoji ? 'none' : 640, position: 'relative', display: 'inline-block' }}>
                <GameLogo
                  title={game.title}
                  theme={game.theme}
                  onDark
                  src={game.art?.logo}
                  // Guess the Emoji reads as a single line; others may wrap (e.g. WoF).
                  style={{ fontSize: isEmoji ? 76 : 92, whiteSpace: isEmoji ? 'nowrap' : 'normal' }}
                />
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
                {/* "NEW GAME" sticker for the freshly-added titles. */}
                {(isEmoji || isWerds) && (
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
                    NEW GAME
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
                  maxWidth: 760,
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
              <GameMetaPills players={game.players} interaction={game.interaction} />
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
              // DS (hub9): FocusableButton — focused/selected = Canary gradient on
              // Midnight-Blue ink + cta-glow, else a warm-white 10% fill. Other
              // variations keep the original white/dark CTA.
              ...(btnFocused && selected
                ? dsAccent
                  ? {
                      background: CTA_GRADIENT,
                      color: STAGE_BG,
                      border: 'none',
                      transform: pressing ? 'scale(0.96)' : 'scale(1.04)',
                      boxShadow: `${CTA_GLOW}, 0 12px 30px rgba(0,0,0,0.5)`,
                    }
                  : {
                      background: INK,
                      color: '#000',
                      border: '1px solid #fff',
                      transform: pressing ? 'scale(0.96)' : 'scale(1.04)',
                      boxShadow: '0 0 0 4px #fff, 0 12px 30px rgba(0,0,0,0.6)',
                    }
                : dsAccent
                  ? {
                      background: 'rgba(243,244,241,0.10)',
                      color: INK,
                      border: 'none',
                      transform: 'scale(1)',
                      boxShadow: 'none',
                    }
                  : {
                      background: '#141518',
                      color: INK,
                      border: '1px solid #3a3b3f',
                      transform: 'scale(1)',
                      boxShadow: 'none',
                    }),
            });
            // Game slides show only PLAY NOW (MORE INFO removed). The promo
            // slide has its own "Claim your free week" CTA above.
            return (
              <button onClick={onPlay} style={ctaStyle(heroCol === 0)}>
                PLAY NOW
              </button>
            );
          })()}
        </div>
      </div>
      )}
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

// The leading tile on the Studio "My games" row. Opens the create-a-game flow.
function CreateGameTile({
  variant,
  focused,
  pressing,
  onClick,
}: {
  variant: TileVariant;
  focused: boolean;
  pressing: boolean;
  onClick: () => void;
}) {
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
        gap: 12,
        // A vivid canary gradient so "Create new game" reads as the primary action.
        background: 'linear-gradient(135deg, #2a2410 0%, #17181c 60%)',
        border: '2px solid rgb(var(--palette-canary-500))',
        color: INK,
        fontFamily: FONT,
        transform: focused ? (pressing ? 'scale(0.98)' : 'scale(1.06)') : 'scale(1)',
        boxShadow: focused ? '0 0 0 4px #fff, 0 26px 60px rgba(0,0,0,0.7)' : 'none',
        transition: 'transform 240ms cubic-bezier(.22,.61,.36,1), box-shadow 240ms ease',
        zIndex: focused ? 3 : 1,
      }}
    >
      <span
        aria-hidden
        style={{
          width: variant === 'lg' ? 64 : 48,
          height: variant === 'lg' ? 64 : 48,
          borderRadius: '50%',
          background: 'rgb(var(--palette-canary-500))',
          color: '#1a1400',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: variant === 'lg' ? 44 : 34,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        +
      </span>
      <span style={{ fontSize: variant === 'lg' ? 30 : 22, fontWeight: 700, letterSpacing: '-0.01em' }}>
        Create new game
      </span>
    </button>
  );
}

// ── GameTile ────────────────────────────────────────────────────────────────

/* Faked "live players" count for the PLAYING chip — deterministic per game (so
   it stays stable across re-renders) and clamped to the 103–999 range. */
function fakePlayingCount(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return 103 + (h % (999 - 103 + 1));
}

export interface TileProps {
  game: HubGame;
  variant: TileVariant;
  focused: boolean;
  pressing: boolean;
  slideshow: boolean;
  shot: number;
  onClick: () => void;
  /** Slideshow only plays once ready (after the 1s focus delay). Default true. */
  slideshowReady?: boolean;
  /** Optional corner tag, e.g. "NEW". */
  badge?: string;
}

export function Tile({
  game,
  variant,
  focused,
  pressing,
  slideshow,
  shot,
  onClick,
  slideshowReady = true,
  badge,
}: TileProps) {
  const t = TILE[variant];
  const showShots = slideshow && focused && slideshowReady;
  // Focus treatment follows the hub theme: `arcade` = Canary gradient ring + gap;
  // `mockup` = the original white ring.
  const dsFocus = useHubTheme().dsAccent;

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
        background: '#141518',
        transform: focused ? (pressing ? 'scale(0.98)' : 'scale(1.06)') : 'scale(1)',
        transition: 'transform 240ms cubic-bezier(.22,.61,.36,1), box-shadow 240ms ease',
        // DS (hub9): Canary halo + drop shadow (the Canary gradient stroke with a
        // gap is the FocusRing below). Other variations keep the original white
        // ring. Both float outside the art, which has its own inner clip.
        boxShadow: focused
          ? dsFocus
            ? `${FOCUS_HALO}, 0 26px 60px rgba(0,0,0,0.7)`
            : '0 0 0 4px #fff, 0 26px 60px rgba(0,0,0,0.7)'
          : 'none',
        zIndex: focused ? 3 : 1,
      }}
    >
      {dsFocus && focused && <FocusRing radius={t.r} gap={variant === 'grid' ? 5 : 6} width={variant === 'grid' ? 4 : 5} />}
      {/* Inner clip: rounds/masks the art while the focus ring floats outside it. */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: t.r, overflow: 'hidden' }}>
      {/* Corner tag (e.g. "NEW") pinned above the art. */}
      {badge && (
        <span
          style={{
            position: 'absolute',
            top: variant === 'grid' ? 8 : 12,
            left: variant === 'grid' ? 8 : 12,
            zIndex: 4,
            fontSize: variant === 'grid' ? 11 : 13,
            fontWeight: 800,
            letterSpacing: '0.1em',
            color: '#000',
            background: INK,
            borderRadius: 6,
            padding: '4px 9px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          {badge}
        </span>
      )}
      {/* Base tile art. Procedural tiles center the game name as the logotype;
          a real composed tile already bakes the wordmark in, so skip the overlay. */}
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
        {!game.art?.tile && (
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
        )}
      </GameArt>

      {/* Slideshow screenshots (loop while focused) */}
      {slideshow &&
        gameShots(game).map((s, i) => (
          <Screenshot
            key={s.key}
            game={game}
            variant={s.variant}
            src={s.src}
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
          {fakePlayingCount(game.id)} PLAYING
        </div>
      )}
      </div>
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
// Studio tab icon — a "magic wand" (create/build).
function IconStudio({ size = 22, color = INK }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m4 20 11-11" />
      <path d="M14 6.5 17.5 3l3.5 3.5L17.5 10Z" />
      <path d="M6 3v3M3.5 4.5h3M18 15v3M16.5 16.5h3" />
    </svg>
  );
}
const NAV_ICONS: Record<Page, (p: { size?: number; color?: string }) => JSX.Element> = {
  search: IconSearch,
  home: IconHome,
  mygames: IconHeart,
  studio: IconStudio,
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
