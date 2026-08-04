// ─────────────────────────────────────────────────────────────────────────
//  Hub prototype — 9-game dataset
//
//  A focused, curated catalog for the "9 games" hub variation. Reuses the
//  shared GameTheme / art system (GameArt / GameLogo) so every title renders a
//  stylized hero, tile and logo at runtime — no raster assets. Player counts
//  and interaction methods are set per this prototype's brief (they may differ
//  from the 30-game catalog in prototype/hub/games.ts), and two brand-new
//  titles — Guess the Emoji and Werds — carry a NEW tag.
// ─────────────────────────────────────────────────────────────────────────
import type { HubGame } from '../hub/games';
import type { HubContent } from '../../components/GameHub';
import { assetUrl } from '../../utils/assetUrl';

/** A hub game with the prototype's per-tile NEW flag. */
export interface Hub9Game extends HubGame {
  /** Freshly-added title — shows a NEW badge on its tile. */
  isNew?: boolean;
}

// Real exported v3 art (v2 for CoComelon — no v3 yet), served from
// packages/tv/public/games/hub9/<id>/. The art system prefers these over the
// procedural theme fallback; `theme` is retained for palette/pill accents.
// Paths go through assetUrl so they resolve under the demo's relative base.
/**
 * Real in-game captures (Foundry exports, cropped to 1280×720) for the titles
 * that have them, served from public/games/hub9/<id>/shots/. Games without
 * captures fall back to the procedural mock frames (see hub/Screenshot).
 */
const REAL_SHOT_COUNTS: Record<string, number> = {
  'guess-the-emoji': 4,
  werds: 4,
  'spot-on': 4,
  'sketchy-af': 4,
};

const shotsFor = (id: string): string[] | undefined => {
  const n = REAL_SHOT_COUNTS[id];
  if (!n) return undefined;
  return Array.from({ length: n }, (_, i) => assetUrl(`/games/hub9/${id}/shots/${i + 1}.jpg`));
};

const artFor = (id: string) => ({
  tile: assetUrl(`/games/hub9/${id}/tile.png`),
  preview: assetUrl(`/games/hub9/${id}/preview.jpg`),
  logo: assetUrl(`/games/hub9/${id}/logo.png`),
  shots: shotsFor(id),
});

// Order matches the requested grid order:
// Jeopardy!, Song Quiz, Wheel of Fortune, Wit's End, CoComelon, Spot On,
// Sketchy AF, Guess the Emoji, Werds.
const HUB9_GAMES_BASE: Hub9Game[] = [
  {
    id: 'jeopardy',
    title: 'Jeopardy!',
    description: 'The iconic answer-and-question quiz show, now on your TV.',
    longDescription:
      "The answer-and-question quiz show, set up for your living room. Pick your categories, buzz in out loud, and decide how much of your score to risk when Final Jeopardy! comes around.",
    players: '1–3 Players',
    interaction: 'Voice Controlled',
    theme: { base: '#03113f', from: '#061a5c', to: '#1e49c7', accent: '#f7c948', pattern: 'grid', logo: 'serif', motif: '💡' },
  },
  {
    id: 'song-quiz',
    title: 'Song Quiz',
    description: 'Name the hit song from a short clip before your friends do.',
    longDescription:
      "Hear a clip, name the song. Play across decades and genres, steal the point when the room hesitates, and settle who actually knows the words rather than just the chorus.",
    players: '1–4 Players',
    interaction: 'Voice Controlled',
    theme: { base: '#1a0b3d', from: '#3a0f7a', to: '#7b2ff7', accent: '#22d3ee', pattern: 'bars', logo: 'block', motif: '🎵' },
  },
  {
    id: 'wheel-of-fortune',
    title: 'Wheel of Fortune',
    description: 'Spin the wheel, solve the puzzle and win big.',
    longDescription:
      "Spin the wheel, call a letter, and solve the puzzle before anyone beats you to it. Prize wedges, bonus rounds and the board you already know how to read.",
    players: '1–3 Players',
    interaction: 'Voice Controlled',
    theme: { base: '#0c1f14', from: '#123a24', to: '#1f9d57', accent: '#ffd23f', pattern: 'grid', logo: 'serif', motif: '🎡' },
  },
  {
    id: 'wits-end',
    title: "Wit's End",
    description: 'A fantasy trivia adventure for the quickest thinkers.',
    longDescription:
      "A fantasy trivia adventure with a story running between the questions. Answer to get through encounters, choose which way to go next, and find out how far what you know will carry you.",
    players: '1–3 Players',
    interaction: 'Voice Controlled',
    theme: { base: '#100b06', from: '#241a10', to: '#5a3d1f', accent: '#e0a94f', pattern: 'rays', logo: 'serif', motif: '🪓' },
  },
  {
    id: 'cocomelon',
    title: 'CoComelon',
    description: 'Sing, dance and play along with JJ and friends.',
    longDescription:
      "Sing, dance and play along with JJ and friends. Familiar songs, gentle prompts and nothing to lose — built for the youngest players in the house, with grown-ups welcome to join in.",
    players: 'Single Player',
    interaction: 'Voice Controlled',
    theme: { base: '#1a7fd4', from: '#3aa0e8', to: '#8fd14f', accent: '#ffd23f', ink: '#0a2a4a', light: true, pattern: 'dots', logo: 'rounded', motif: '🍉' },
  },
  {
    id: 'spot-on',
    title: 'Spot On',
    description: 'Race to pinpoint places on a spinning globe.',
    longDescription:
      "Race to pinpoint places on a spinning globe. Landmarks, cities and flags, from rounds anyone can win to ones that will start an argument about where exactly Madagascar is.",
    players: '1–4 Players',
    interaction: 'Gesture Controlled',
    theme: { base: '#02040f', from: '#071634', to: '#155e9c', accent: '#f5b642', pattern: 'waves', logo: 'block', motif: '🌍' },
  },
  {
    id: 'sketchy-af',
    title: 'Sketchy AF',
    description: 'Draw it, guess it, then laugh about it together.',
    longDescription:
      "Draw it, guess it, then laugh about it. Everyone sketches on their own phone while the TV keeps score, and no artistic ability is required — or, frankly, expected.",
    players: '1–4 Players',
    interaction: 'Voice Controlled',
    theme: { base: '#efeee9', from: '#f7f6f2', to: '#e3e2dc', accent: '#f72149', ink: '#141414', light: true, pattern: 'sketch', logo: 'script', motif: '✏️' },
  },
  {
    id: 'guess-the-emoji',
    title: 'Guess the Emoji',
    description: 'Crack the phrase hiding inside a string of emoji.',
    longDescription:
      "Crack the phrase hiding inside a string of emoji. Films, foods, sayings and things that only make sense the second somebody finally shouts the answer out.",
    players: '1–6 Players',
    interaction: 'Voice Controlled',
    isNew: true,
    theme: { base: '#1a0b2e', from: '#6d28d9', to: '#f472b6', accent: '#fde047', pattern: 'confetti', logo: 'rounded', motif: '😄' },
  },
  {
    id: 'werds',
    title: 'Werds',
    description: 'Type the answer faster than the room to steal the round.',
    longDescription:
      "Type the answer faster than the room to steal the round. The keyboard shuffles under you, the clock keeps running, and your typos are very much part of the fun.",
    players: '1–4 Players',
    interaction: 'Typing',
    isNew: true,
    theme: { base: '#07231f', from: '#0c3a33', to: '#14b8a6', accent: '#fde047', pattern: 'grid', logo: 'block', motif: '⌨️' },
  },
];

/** Each game with its real exported art attached. */
export const HUB9_GAMES: Hub9Game[] = HUB9_GAMES_BASE.map((g) => ({ ...g, art: artFor(g.id) }));

export const getHub9Game = (id: string): Hub9Game => {
  const g = HUB9_GAMES.find((x) => x.id === id);
  if (!g) throw new Error(`hub9: unknown game id "${id}"`);
  return g;
};

/** The "New Games" shelf, in the requested order. */
export const HUB9_NEW_ROW: Hub9Game[] = [
  'guess-the-emoji',
  'werds',
  'wheel-of-fortune',
  'sketchy-af',
  'spot-on',
].map(getHub9Game);

/** The "All Games" grid, in the requested order (5 across). */
export const HUB9_GRID: Hub9Game[] = HUB9_GAMES;

/**
 * Curated merch-hero slides (the tall billboard carousel). Each is a full-bleed
 * lifestyle creative (exported from the Figma "Merchandise Hero" [EDIT THIS]
 * frames — photo + headline + subtitle + baked-in left fade) with two game tiles
 * overlaid; there's no CTA button. The free-trial promo is still prepended as
 * slide 1 by GameHub.
 */
export interface Hub9MerchSlide {
  key: string;
  /** Full-bleed creative background (1920×900). */
  bg: string;
  /** The two games offered on this slide (left, right). */
  games: [string, string];
}

export const HUB9_MERCH: Hub9MerchSlide[] = [
  { key: 'game-night', bg: assetUrl('/games/hub9/merch/game-night.jpg'), games: ['jeopardy', 'song-quiz'] },
  { key: 'shout-out', bg: assetUrl('/games/hub9/merch/shout-out.jpg'), games: ['guess-the-emoji', 'sketchy-af'] },
  { key: 'free-time', bg: assetUrl('/games/hub9/merch/free-time.jpg'), games: ['wheel-of-fortune', 'spot-on'] },
];

/**
 * Curated content for the 9-game hub, fed to GameHub's `content` prop so it
 * renders through all the standard hub elements. The hero shows the existing
 * free-trial promo slide plus Guess the Emoji, Werds and Wheel of Fortune as new
 * game slides; below it, a "Featured" shelf and the All Games grid.
 */
export const HUB9_CONTENT: HubContent = {
  catalog: HUB9_GAMES,
  heroGames: ['guess-the-emoji', 'werds', 'wheel-of-fortune'].map(getHub9Game),
  heroMerch: HUB9_MERCH,
  shelves: [{ key: 'new', title: 'Featured', games: HUB9_NEW_ROW }],
  grid: HUB9_GRID,
  newIds: ['guess-the-emoji', 'werds'],
};
