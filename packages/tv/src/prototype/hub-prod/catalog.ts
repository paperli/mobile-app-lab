// ─────────────────────────────────────────────────────────────────────────
//  Production hub — content
//
//  Transcribed from the prod hub repo (Projects/hub, apps/client):
//    · layout  ← public/homeLayout.production.json  (Amplitude `hub-home-layout`
//                build snapshot, 2026-11-04): a 3-item merch hero, then five
//                "fixed" rows of large tiles.
//    · games   ← public/gameAssets.production.json  (titles, short
//                descriptions, player counts, control flags, status).
//
//  Art: tiles come from the prototype library (hub9 + personalization
//  catalog). Preview-band art and logos are hub9's where it has them, else
//  prod's heroV2 / logo exports copied into public/games/prod/<id>/. Prod
//  logos are exported at 2x (see HeroPreviewOverlay LOGO_EXPORT_SCALE); hub9's
//  are 1x.
//
//  Left out: `wheel-of-fortune-foundry` — a platform-gated duplicate of
//  Wheel of Fortune that never shows next to it on a real device.
// ─────────────────────────────────────────────────────────────────────────

import { assetUrl } from '../../utils/assetUrl';
import { ONBOARDING_ID } from '../hub9/onboarding';

export type GameStatus = 'new' | 'early-access' | 'coming-soon';

export interface ProdGame {
  id: string;
  title: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  voice?: boolean;
  hand?: boolean;
  status?: GameStatus;
  tile: string;
  preview?: string;
  logo?: string;
  /** Export scale of `logo` (2 = @2x, so its designed size is half). */
  logoScale?: number;
}

const hub9 = (dir: string) => ({
  tile: assetUrl(`/games/hub9/${dir}/tile.png`),
  preview: assetUrl(`/games/hub9/${dir}/preview.jpg`),
  logo: assetUrl(`/games/hub9/${dir}/logo.png`),
  logoScale: 1,
});
const lib = (tileDir: string, prodId: string, logoExt: 'png' | 'webp') => ({
  tile: assetUrl(`/games/catalog/${tileDir}/tile.jpg`),
  preview: assetUrl(`/games/prod/${prodId}/preview.webp`),
  logo: assetUrl(`/games/prod/${prodId}/logo.${logoExt}`),
  logoScale: 2,
});

const GAMES: ProdGame[] = [
  { id: 'wheel-of-fortune', title: 'Wheel of Fortune', description: 'Spin, solve, and win.', minPlayers: 1, maxPlayers: 3, voice: true, ...hub9('wheel-of-fortune') },
  { id: 'jeopardy', title: 'Jeopardy', description: 'The iconic quiz show. Now on your TV.', minPlayers: 1, maxPlayers: 3, voice: true, ...hub9('jeopardy') },
  { id: 'song-quiz', title: 'Song Quiz', description: 'Guess songs from every era.', minPlayers: 1, maxPlayers: 4, voice: true, ...hub9('song-quiz') },
  { id: 'emoji-multiplatform', title: 'Guess The Emoji', description: 'Crack the phrase hiding inside a string of emoji.', minPlayers: 1, maxPlayers: 6, voice: true, status: 'new', ...hub9('guess-the-emoji') },
  { id: 'sketchy-af', title: 'Sketchy AF', description: 'Draw it. Guess it. Win it.', minPlayers: 1, maxPlayers: 4, voice: true, ...hub9('sketchy-af') },
  { id: 'spot-on', title: 'Spot On', description: 'Explore. Guess. Discover the world.', minPlayers: 1, maxPlayers: 4, hand: true, ...hub9('spot-on') },
  { id: 'wits-end', title: "Wit's End", description: 'Fantasy Adventure Game.', minPlayers: 1, maxPlayers: 3, voice: true, ...hub9('wits-end') },
  { id: 'cocomelon', title: 'CoComelon', description: 'Sing, play, and learn with CoComelon.', minPlayers: 1, maxPlayers: 1, voice: true, ...hub9('cocomelon') },
  { id: 'werds-pur-minite', title: 'Werds Pur Minite', description: 'Scramble. Type. Laugh.', minPlayers: 1, maxPlayers: 4, hand: true, status: 'new', ...hub9('werds') },
  { id: 'bingo', title: 'Bingo', description: 'Daub your card. Race the room. Yell Bingo.', minPlayers: 1, maxPlayers: 10, hand: true, status: 'new', ...lib('bingo', 'bingo', 'png') },
  { id: 'weekend-poker', title: 'Weekend Poker', description: 'Peek your hand. Read the room. Shove all in.', minPlayers: 1, maxPlayers: 5, hand: true, status: 'new', ...lib('weekend-poker', 'weekend-poker', 'png') },
  { id: 'meme-supreme', title: 'Meme Supreme', description: 'Guess the memes. Rule the internet.', minPlayers: 1, maxPlayers: 8, hand: true, status: 'new', ...lib('meme-supreme', 'meme-supreme', 'png') },
  { id: 'word-rush', title: 'Word Rush', description: 'Build the longest word. Beat the clock.', minPlayers: 1, maxPlayers: 6, hand: true, status: 'new', ...lib('word-rush', 'word-rush', 'png') },
  { id: 'color-matchup', title: 'Color Matchup', description: 'Exhibit your artistry and memory.', minPlayers: 1, maxPlayers: 6, hand: true, ...lib('color-matchup', 'color-matchup', 'webp') },
  { id: 'gibberish', title: 'Gibberish', description: 'Sound out the gibberish and guess the hidden phrase.', minPlayers: 1, maxPlayers: 8, voice: true, status: 'new', ...lib('gibberish', 'gibberish', 'webp') },
  { id: 'the-price-is-right', title: 'The Price Is Right', description: 'Bid on prizes, play pricing games, and spin the Big Wheel.', minPlayers: 1, maxPlayers: 4, voice: true, hand: true, status: 'early-access', ...lib('the-price-is-right', 'the-price-is-right', 'webp') },
  { id: 'marble-race', title: 'Marble Race', description: '', minPlayers: 1, maxPlayers: 8, hand: true, status: 'new', ...lib('marble-race', 'marble-race', 'webp') },
  { id: 'it-is-cake', title: 'Cut the Cake!', description: "Slice what's cake. Spare what isn't.", minPlayers: 1, maxPlayers: 4, hand: true, status: 'new', ...lib('cut-the-cake', 'it-is-cake', 'png') },
  { id: 'let-build-ball-pool', title: 'Weekend Pool', description: 'Rack up and run the table with friends or the house bot.', minPlayers: 1, maxPlayers: 2, hand: true, status: 'new', ...lib('weekend-pool', 'let-build-ball-pool', 'webp') },
  { id: 'storytime', title: 'Storytime', description: 'A little imagination. A whole world of stories.', minPlayers: 1, maxPlayers: 1, voice: true, ...lib('storytime', 'storytime', 'webp') },
  { id: 'thats-what-we-said', title: 'Short List', description: 'There are no bad ideas. Just unpopular ones.', minPlayers: 1, maxPlayers: 4, voice: true, hand: true, status: 'new', ...lib('short-list', 'thats-what-we-said', 'png') },
  { id: 'spot-the-gubs', title: 'Spot The Gubs', description: 'A hidden object race', minPlayers: 1, maxPlayers: 6, hand: true, status: 'new', ...lib('spot-the-gubs', 'spot-the-gubs', 'png') },
  { id: 'bff', title: 'BFF', description: 'The party game for besties!', minPlayers: 2, maxPlayers: 6, hand: true, status: 'new', ...lib('bffs', 'bff', 'png') },
];

/** The onboarding prototype as a launchable tile (hands off, never "launches"). */
export const ONBOARDING_TILE: ProdGame = {
  id: ONBOARDING_ID,
  title: 'Welcome to Weekend',
  description: 'Meet your host and set up your phone — the guided first-run flow.',
  minPlayers: 1,
  maxPlayers: 1,
  voice: true,
  tile: '',
};

export const GAME_BY_ID = new Map(GAMES.map((g) => [g.id, g]));
const g = (id: string): ProdGame => {
  const game = GAME_BY_ID.get(id);
  if (!game) throw new Error(`hub-prod: unknown game ${id}`);
  return game;
};

// ── Hero (homeLayout.production.json → hero.items) ─────────────────────────
export type HeroOrientation = 'left' | 'right' | 'center' | 'split';
export type HeroItem =
  | { kind: 'billboard'; key: string; game: ProdGame; art: string; ctaLabel: string; contentOffsetY: number }
  | { kind: 'carousel'; key: string; games: ProdGame[]; art: string; orientation: HeroOrientation; contentOffsetY: number };

export const HERO_ITEMS: HeroItem[] = [
  { kind: 'billboard', key: 'wof', game: g('wheel-of-fortune'), art: assetUrl('/games/hub9/merch/wheel-of-fortune.webp'), ctaLabel: 'PLAY NOW', contentOffsetY: 30 },
  { kind: 'carousel', key: 'shout-out', games: [g('emoji-multiplatform'), g('sketchy-af')], art: assetUrl('/games/hub9/merch/shout-out.jpg'), orientation: 'left', contentOffsetY: 90 },
  { kind: 'carousel', key: 'free-time', games: [g('spot-on'), g('song-quiz')], art: assetUrl('/games/hub9/merch/free-time.jpg'), orientation: 'left', contentOffsetY: 90 },
];

// ── Rows (homeLayout.production.json → fixed rows) ─────────────────────────
export interface HubRow {
  key: string;
  title: string;
  games: ProdGame[];
}

const row = (key: string, title: string, ids: string[]): HubRow => ({ key, title, games: ids.map(g) });

export const HUB_ROWS: HubRow[] = [
  row('popular', 'Most Popular', ['jeopardy', 'song-quiz', 'wheel-of-fortune', 'bingo', 'weekend-poker', 'meme-supreme', 'emoji-multiplatform', 'spot-on']),
  row('new', 'New on Weekend', ['color-matchup', 'gibberish', 'the-price-is-right', 'marble-race', 'it-is-cake', 'let-build-ball-pool', 'storytime', 'thats-what-we-said', 'spot-the-gubs', 'bingo', 'weekend-poker', 'word-rush', 'bff', 'meme-supreme', 'werds-pur-minite']),
  row('party', 'Party Starters', ['song-quiz', 'meme-supreme', 'bingo', 'sketchy-af', 'weekend-poker', 'word-rush', 'wits-end', 'spot-on']),
  row('family', 'Family Favorites', ['sketchy-af', 'cocomelon', 'emoji-multiplatform', 'bingo', 'song-quiz', 'wits-end', 'wheel-of-fortune', 'jeopardy']),
  row('skills', 'Test Your Skills', ['word-rush', 'spot-on', 'sketchy-af', 'werds-pur-minite', 'emoji-multiplatform', 'wheel-of-fortune', 'song-quiz']),
];

/** Prototype-only row: keeps the onboarding replayable from the hub. */
export const ONBOARDING_ROW: HubRow = { key: 'welcome', title: 'Get Started', games: [ONBOARDING_TILE] };

// ── Pills (prod constants/gamePills.ts) ───────────────────────────────────
export interface GamePill {
  icon: string;
  label: string;
}

export function playersLabel(min: number, max: number): string {
  if (min === max) return min === 1 ? 'Single Player' : `${min} Players`;
  return `${min}–${max} Players`;
}

export function gamePills(game: ProdGame): GamePill[] {
  const pills: GamePill[] = [{ icon: assetUrl('/brand/pills/players.webp'), label: playersLabel(game.minPlayers, game.maxPlayers) }];
  if (game.voice) pills.push({ icon: assetUrl('/brand/pills/voice.webp'), label: 'Voice Control' });
  if (game.hand) pills.push({ icon: assetUrl('/brand/pills/hand.webp'), label: 'Touch & Gesture' });
  return pills;
}

export const STATUS_LABEL: Record<GameStatus, string> = {
  new: 'NEW',
  'early-access': 'EARLY ACCESS',
  'coming-soon': 'COMING SOON',
};

// ── Tokens (prod Variables.scss) ───────────────────────────────────────────
export const MIDNIGHT = '#0a0322';
export const INK = '#f3f4f1';
export const CANARY = '#ffda0a';
export const CANARY_LIGHT = '#fff09e';
export const FONT = "'Weekend Repro', Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
export const WEEKEND_LOGO = assetUrl('/brand/weekend-logo.svg');

/** The prod scrim ramp (Variables.scss $scrim-ramp) as gradient stops. */
const SCRIM_RAMP: [number, number][] = [
  [0, 1], [0.081, 0.987], [0.155, 0.951], [0.225, 0.896], [0.29, 0.825], [0.353, 0.741], [0.412, 0.648], [0.471, 0.55],
  [0.529, 0.45], [0.588, 0.352], [0.647, 0.259], [0.706, 0.175], [0.775, 0.104], [0.845, 0.049], [0.919, 0.013], [1, 0],
];
/** Eased scrim from `from` to `to` (any CSS length expressions). */
export function scrimStops(from: (t: number) => string): string {
  return SCRIM_RAMP.map(([t, a]) => `rgba(10,3,34,${a}) ${from(t)}`).join(', ');
}
