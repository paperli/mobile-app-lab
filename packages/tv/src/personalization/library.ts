// ─────────────────────────────────────────────────────────────────────────
//  Game library — the hub prototype's 30-game dataset, enriched with the
//  personalization taxonomy.
//
//  Tiles render with the hub's generated art (GameTileV2 / GameArt), so the
//  simulator uses the exact same library as the hub layout explorations.
//  Each hub game gets a taxonomy layer here; anything not authored per-game is
//  filled from genre defaults. `buildLibrary(size)` returns a deterministic
//  slice.
// ─────────────────────────────────────────────────────────────────────────

import { HUB_GAMES, type HubGame } from '../prototype/hub/games';
import type {
  Audience,
  Competition,
  Cooperation,
  Difficulty,
  Game,
  Genre,
  Interaction,
  Lifecycle,
  Motivation,
  PlayerBand,
} from './types';

// ── Per-genre defaults (fill anything a game doesn't override) ──────────────

interface GenreDefault {
  motivations: Motivation[];
  difficulty: Difficulty;
  session: number;
  competition: Competition[];
  cooperation: Cooperation[];
  audiences: Audience[];
}

const GENRE_DEFAULTS: Record<Genre, GenreDefault> = {
  Trivia: { motivations: ['Knowledge', 'Social Competition'], difficulty: 'Medium', session: 18, competition: ['PvP'], cooperation: ['None'], audiences: ['Adults', 'Family'] },
  Music: { motivations: ['Performance', 'Knowledge'], difficulty: 'Medium', session: 16, competition: ['PvP', 'Performance'], cooperation: ['None'], audiences: ['Family', 'Adults'] },
  Word: { motivations: ['Knowledge', 'Mastery'], difficulty: 'Medium', session: 12, competition: ['PvP', 'PvE'], cooperation: ['None'], audiences: ['Family', 'Adults'] },
  Party: { motivations: ['Social Cooperation', 'Creativity'], difficulty: 'Easy', session: 20, competition: ['Team'], cooperation: ['TeamCoop'], audiences: ['Family', 'Adults'] },
  Puzzle: { motivations: ['Mastery', 'Relaxation'], difficulty: 'Hard', session: 16, competition: ['PvE'], cooperation: ['None'], audiences: ['Adults'] },
  Action: { motivations: ['Performance', 'Mastery'], difficulty: 'Medium', session: 15, competition: ['PvP', 'Performance'], cooperation: ['None'], audiences: ['Family', 'Adults'] },
  Kids: { motivations: ['Creativity', 'Knowledge'], difficulty: 'Easy', session: 10, competition: ['None'], cooperation: ['Coop'], audiences: ['Kids'] },
  Strategy: { motivations: ['Mastery', 'Social Competition'], difficulty: 'Hard', session: 30, competition: ['PvP', 'PvE'], cooperation: ['None'], audiences: ['Adults'] },
};

// ── Authored taxonomy per hub game id ───────────────────────────────────────

interface Tax {
  genre: Genre;
  themes: string[];
  lifecycle: Lifecycle;
  trending: number;
  editorial: number;
  // optional overrides
  motivations?: Motivation[];
  difficulty?: Difficulty;
  session?: number;
  competition?: Competition[];
  cooperation?: Cooperation[];
  audiences?: Audience[];
  interactions?: Interaction[];
  physical?: boolean;
}

const TAX: Record<string, Tax> = {
  // Featured 7
  jeopardy: { genre: 'Trivia', themes: ['general knowledge', 'game show'], lifecycle: 'Evergreen', trending: 0.74, editorial: 0.2, difficulty: 'Hard', motivations: ['Knowledge', 'Mastery', 'Social Competition'] },
  'song-quiz': { genre: 'Music', themes: ['pop', 'nostalgia', 'party'], lifecycle: 'Evergreen', trending: 0.84, editorial: 0.3, motivations: ['Knowledge', 'Social Competition', 'Performance'] },
  cocomelon: { genre: 'Kids', themes: ['nursery', 'sing-along', 'family'], lifecycle: 'Evergreen', trending: 0.55, editorial: 0.35, session: 10 },
  'wheel-of-fortune': { genre: 'Word', themes: ['puzzle', 'game show'], lifecycle: 'Evergreen', trending: 0.7, editorial: 0.2, difficulty: 'Medium', session: 20 },
  'wits-end': { genre: 'Trivia', themes: ['fantasy', 'adventure'], lifecycle: 'Evergreen', trending: 0.6, editorial: 0.18, difficulty: 'Hard' },
  'sketchy-af': { genre: 'Party', themes: ['drawing', 'party', 'comedy'], lifecycle: 'Evergreen', trending: 0.72, editorial: 0.25 },
  // The two hub9 debuts. Authored here so the recommender scores them properly
  // instead of falling back to the generic Party default.
  'guess-the-emoji': { genre: 'Word', themes: ['emoji', 'wordplay', 'party'], lifecycle: 'New', trending: 0.9, editorial: 0.4, motivations: ['Knowledge', 'Social Competition'], difficulty: 'Easy', session: 12 },
  werds: { genre: 'Word', themes: ['typing', 'wordplay', 'speed'], lifecycle: 'New', trending: 0.86, editorial: 0.35, motivations: ['Mastery', 'Social Competition'], difficulty: 'Medium', session: 10, interactions: ['Touch'] },
  'spot-on': { genre: 'Trivia', themes: ['geography', 'globe'], lifecycle: 'Evergreen', trending: 0.58, editorial: 0.18, difficulty: 'Medium' },
  // More 23
  'trivia-royale': { genre: 'Trivia', themes: ['general knowledge', 'battle'], lifecycle: 'Evergreen', trending: 0.68, editorial: 0.15 },
  'charades-live': { genre: 'Party', themes: ['acting', 'teams'], lifecycle: 'Evergreen', trending: 0.64, editorial: 0.2 },
  'doodle-dash': { genre: 'Party', themes: ['drawing', 'speed'], lifecycle: 'Evergreen', trending: 0.55, editorial: 0.15 },
  'beat-breaker': { genre: 'Music', themes: ['rhythm', 'skill'], lifecycle: 'New', trending: 0.33, editorial: 0.65, difficulty: 'Adaptive', motivations: ['Mastery', 'Performance'] },
  'word-rush': { genre: 'Word', themes: ['vocabulary', 'speed'], lifecycle: 'Evergreen', trending: 0.5, editorial: 0.1 },
  'emoji-riddle': { genre: 'Word', themes: ['emoji', 'puzzle'], lifecycle: 'New', trending: 0.35, editorial: 0.7, difficulty: 'Easy' },
  'pixel-painters': { genre: 'Party', themes: ['drawing', 'creativity'], lifecycle: 'New', trending: 0.36, editorial: 0.62 },
  'karaoke-kings': { genre: 'Music', themes: ['singing', 'party', 'performance'], lifecycle: 'Evergreen', trending: 0.71, editorial: 0.25, difficulty: 'Easy', motivations: ['Performance', 'Creativity', 'Social Cooperation'], cooperation: ['Coop'] },
  'dance-floor': { genre: 'Action', themes: ['dance', 'party', 'fitness'], lifecycle: 'Evergreen', trending: 0.66, editorial: 0.2 },
  'guess-the-movie': { genre: 'Trivia', themes: ['movies', 'pop culture'], lifecycle: 'Evergreen', trending: 0.58, editorial: 0.15 },
  'sports-iq': { genre: 'Trivia', themes: ['sports'], lifecycle: 'Evergreen', trending: 0.44, editorial: 0.1 },
  'escape-room': { genre: 'Puzzle', themes: ['mystery', 'co-op', 'logic'], lifecycle: 'Evergreen', trending: 0.49, editorial: 0.2, cooperation: ['Coop'], competition: ['None'], motivations: ['Mastery', 'Social Cooperation'], session: 30 },
  'mind-meld': { genre: 'Party', themes: ['word', 'sync'], lifecycle: 'New', trending: 0.4, editorial: 0.6, cooperation: ['Coop'] },
  'fitness-frenzy': { genre: 'Action', themes: ['fitness', 'workout'], lifecycle: 'Evergreen', trending: 0.42, editorial: 0.2, competition: ['Performance'] },
  'puzzle-panic': { genre: 'Puzzle', themes: ['tetromino', 'speed'], lifecycle: 'Evergreen', trending: 0.41, editorial: 0.1, difficulty: 'Medium', session: 10 },
  'story-builder': { genre: 'Party', themes: ['storytelling', 'creativity'], lifecycle: 'Evergreen', trending: 0.45, editorial: 0.15, motivations: ['Creativity', 'Social Cooperation'] },
  'quick-draw-duel': { genre: 'Party', themes: ['drawing', 'duel'], lifecycle: 'Evergreen', trending: 0.4, editorial: 0.12, competition: ['PvP'], cooperation: ['None'] },
  'map-masters': { genre: 'Trivia', themes: ['geography', 'maps'], lifecycle: 'Evergreen', trending: 0.43, editorial: 0.1, difficulty: 'Hard' },
  'music-maestro': { genre: 'Music', themes: ['orchestra', 'rhythm'], lifecycle: 'Evergreen', trending: 0.39, editorial: 0.12, motivations: ['Performance', 'Mastery'] },
  'brain-bender': { genre: 'Puzzle', themes: ['riddles', 'logic'], lifecycle: 'Evergreen', trending: 0.42, editorial: 0.1, motivations: ['Mastery', 'Knowledge'] },
  'number-ninja': { genre: 'Puzzle', themes: ['math', 'speed'], lifecycle: 'New', trending: 0.3, editorial: 0.55, difficulty: 'Adaptive' },
  'trivia-titans': { genre: 'Trivia', themes: ['general knowledge', 'buzzer'], lifecycle: 'Evergreen', trending: 0.5, editorial: 0.12 },
};

// ── Builders ────────────────────────────────────────────────────────────────

function parsePlayers(players: string): { min: number; max: number } {
  if (/single/i.test(players)) return { min: 1, max: 1 };
  const nums = players.match(/\d+/g)?.map(Number) ?? [1, 4];
  if (nums.length === 1) return { min: nums[0], max: nums[0] };
  return { min: nums[0], max: nums[nums.length - 1] };
}

function mapInteraction(hub: HubGame['interaction']): Interaction {
  switch (hub) {
    case 'Voice Controlled':
      return 'Voice';
    case 'Buzzer':
      return 'Buzzer';
    case 'Gyro Controlled':
      return 'Gyro';
    case 'Gesture Controlled':
      return 'Touch';
    case 'Motion Capture':
      return 'Camera';
    default:
      return 'Touch';
  }
}

function bandsFor(min: number, max: number): PlayerBand[] {
  const out: PlayerBand[] = [];
  if (min <= 1 && max >= 1) out.push('1');
  if (min <= 2 && max >= 2) out.push('2');
  if (min <= 4 && max >= 3) out.push('3-4');
  if (max >= 5) out.push('5+');
  return out.length ? out : ['1'];
}

/**
 * Lift a hub game into the personalization taxonomy. Exported so surfaces
 * outside the simulator — e.g. the detail page's "You may also like" row, which
 * runs over a curated catalog rather than the 30-game library — can score games
 * through the same engine.
 */
export function enrichHubGame(hub: HubGame): Game {
  return enrich(hub);
}

function enrich(hub: HubGame): Game {
  const t = TAX[hub.id] ?? { genre: 'Party', themes: [], lifecycle: 'Evergreen', trending: 0.4, editorial: 0.1 };
  const gd = GENRE_DEFAULTS[t.genre];
  const { min, max } = parsePlayers(hub.players);
  const primary = mapInteraction(hub.interaction);
  let interactions = t.interactions ?? [primary];
  if (t.genre === 'Trivia' && !interactions.includes('Buzzer')) interactions = [...interactions, 'Buzzer'];
  const voiceRequired = hub.interaction === 'Voice Controlled' && t.genre === 'Music';
  const cameraRequired = hub.interaction === 'Motion Capture';
  const physicalActivity = t.physical ?? (hub.interaction === 'Motion Capture' || t.genre === 'Action');

  return {
    id: hub.id,
    title: hub.title,
    emoji: hub.theme.motif,
    accent: hub.theme.accent,
    hub,
    genre: t.genre,
    themes: t.themes,
    motivations: t.motivations ?? gd.motivations,
    interactions,
    difficulty: t.difficulty ?? gd.difficulty,
    typicalSessionMin: t.session ?? gd.session,
    voiceRequired,
    cameraRequired,
    physicalActivity,
    participation: min <= 1 ? ['Solo', 'Multiplayer'] : ['Multiplayer'],
    competition: t.competition ?? gd.competition,
    cooperation: t.cooperation ?? gd.cooperation,
    minPlayers: min,
    maxPlayers: max,
    recommendedBands: bandsFor(min, max),
    audiences: t.audiences ?? gd.audiences,
    lifecycle: t.lifecycle,
    trending: t.trending,
    editorial: t.editorial,
  };
}

/** Full enriched catalog (all 30 hub games). */
export const CATALOG: Game[] = HUB_GAMES.map(enrich);

export const MAX_LIBRARY = CATALOG.length;

/** Return a catalog of `size` games (deterministic slice of the hub set). */
export function buildLibrary(size: number): Game[] {
  const n = Math.max(1, Math.min(size, CATALOG.length));
  return CATALOG.slice(0, n);
}

/** All genres actually present in a library (for chart axes, etc.). */
export function genresIn(games: Game[]): Genre[] {
  const set = new Set<Genre>();
  for (const g of games) set.add(g.genre);
  return Array.from(set);
}
