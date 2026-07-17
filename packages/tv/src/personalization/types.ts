// ─────────────────────────────────────────────────────────────────────────
//  Personalization — type contract
//
//  A compact, rule-based model of the Weekend Game Personalization &
//  Recommendation Strategy (see docs/personalization/00-personalization-
//  strategy.md). Everything here is intentionally UI-agnostic so the engine
//  can be unit-reasoned and demonstrated by the simulator.
// ─────────────────────────────────────────────────────────────────────────

import type { HubGame } from '../prototype/hub/games';

// ── Game taxonomy vocabulary ───────────────────────────────────────────────

export type Genre =
  | 'Trivia'
  | 'Music'
  | 'Word'
  | 'Party'
  | 'Puzzle'
  | 'Action'
  | 'Kids'
  | 'Strategy';

export const GENRES: Genre[] = [
  'Trivia',
  'Music',
  'Word',
  'Party',
  'Puzzle',
  'Action',
  'Kids',
  'Strategy',
];

export type Motivation =
  | 'Knowledge'
  | 'Mastery'
  | 'Relaxation'
  | 'Creativity'
  | 'Performance'
  | 'Social Competition'
  | 'Social Cooperation';

export const MOTIVATIONS: Motivation[] = [
  'Knowledge',
  'Mastery',
  'Relaxation',
  'Creativity',
  'Performance',
  'Social Competition',
  'Social Cooperation',
];

export type Interaction = 'Voice' | 'Touch' | 'Camera' | 'Gyro' | 'Buzzer';
export const INTERACTIONS: Interaction[] = ['Voice', 'Touch', 'Camera', 'Gyro', 'Buzzer'];

export type Participation = 'Solo' | 'Multiplayer';
export type Competition = 'None' | 'PvE' | 'PvP' | 'Team' | 'Performance';
export type Cooperation = 'None' | 'Coop' | 'TeamCoop';
export type Audience = 'Kids' | 'Family' | 'Adults';
export const AUDIENCES: Audience[] = ['Kids', 'Family', 'Adults'];

export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Adaptive';
export type Lifecycle = 'New' | 'Evergreen' | 'Seasonal';

/** Recommended party bands, matching the strategy doc. */
export type PlayerBand = '1' | '2' | '3-4' | '5+';
export const PLAYER_BANDS: PlayerBand[] = ['1', '2', '3-4', '5+'];

/** The band an active-player count falls into. */
export function bandForCount(n: number): PlayerBand {
  if (n <= 1) return '1';
  if (n === 2) return '2';
  if (n <= 4) return '3-4';
  return '5+';
}

// ── Game ────────────────────────────────────────────────────────────────

export interface Game {
  id: string;
  title: string;
  emoji: string;
  /** Accent color for the tile (hex). */
  accent: string;
  /** The hub-prototype game record, used to render the generated-art tile. */
  hub: HubGame;
  // Core taxonomy
  genre: Genre;
  themes: string[];
  motivations: Motivation[];
  interactions: Interaction[];
  difficulty: Difficulty;
  /** Typical full-session length, minutes. */
  typicalSessionMin: number;
  voiceRequired: boolean;
  cameraRequired: boolean;
  physicalActivity: boolean;
  // Social taxonomy
  participation: Participation[];
  competition: Competition[];
  cooperation: Cooperation[];
  minPlayers: number;
  maxPlayers: number;
  recommendedBands: PlayerBand[];
  audiences: Audience[];
  // Merchandising / lifecycle
  lifecycle: Lifecycle;
  /** 0–1 community popularity signal. */
  trending: number;
  /** 0–1 editorial / launch priority boost. */
  editorial: number;
}

// ── Per-game behavioral evidence (long-term) ──────────────────────────────

export interface GameFeature {
  /** 0–1 recency-weighted engagement strength. */
  engagement: number;
  /** 0–1 satisfaction probability (completion / replay / normal exits). */
  satisfaction: number;
  /** How many days ago it was last played; null = never. */
  lastPlayedDaysAgo: number | null;
  playCount: number;
  /** 0–1 fatigue from repeated recent exposure / overplay. */
  fatigue: number;
}

// ── Player profile (long-term individual preferences) ─────────────────────

export interface PlayerProfile {
  id: string;
  label: string;
  /** 0–1 affinity per genre. */
  genreAffinity: Record<Genre, number>;
  /** 0–1 affinity per motivation. */
  motivationAffinity: Record<Motivation, number>;
  /** -1..1 preference per interaction (negative = tends to avoid). */
  interactionPref: Record<Interaction, number>;
  /** Interactions the player actively avoids (hard-ish penalty). */
  avoidedInteractions: Interaction[];
  /** 0–1 audience preference. */
  audiencePref: Record<Audience, number>;
  favoriteGameIds: string[];
  /** Probability mass over the party bands the player usually appears in. */
  partySizeDistribution: Record<PlayerBand, number>;
  /** Average preferred session length, minutes. */
  avgSessionMin: number;
  /** 0–1 tendency to try (and enjoy) new games. */
  noveltyReceptivity: number;
  /** Per-game evidence keyed by game id. */
  perGame: Record<string, GameFeature>;
}

// ── Household profile (shared behavior) ───────────────────────────────────

export interface HouseholdProfile {
  /** Typical active-player count when the household plays together. */
  avgPartySize: number;
  /** 0–1 preference for family-friendly content. */
  familyFriendly: number;
  /** 0–1 tendency to play on weekends / in groups. */
  weekendPlayer: number;
  /** gameId -> gameIds that historically follow it in a session. */
  transitions: Record<string, string[]>;
}

// ── Session context (Warm Hub only) ───────────────────────────────────────

export interface SessionContext {
  previousGameId: string;
  activePlayerCount: number;
  connectedPhones: number;
  gameMode: string | null;
  sessionLengthMin: number;
  dayOfWeek: number; // 0=Sun..6=Sat
  localHour: number; // 0..23
}

// ── Recommendation output ─────────────────────────────────────────────────

export type ReasonCode =
  | 'PARTY_SIZE_MATCH'
  | 'PREVIOUS_GAME_SIMILARITY'
  | 'GENRE_CONTINUATION'
  | 'TEAM_GAME'
  | 'RECENTLY_PLAYED'
  | 'TAXONOMY_AFFINITY'
  | 'SIMILAR_TO_FAVORITE'
  | 'REACTIVATION'
  | 'UNDEREXPOSED_MATCH'
  | 'NEW_RELEASE_MATCH'
  | 'CONTEXTUAL_POPULARITY'
  | 'EDITORIAL_PICK'
  | 'EXPLORATION'
  | 'NEUTRAL_RECOMMENDATION';

export type EvidenceScope =
  | 'PROFILE'
  | 'HOUSEHOLD'
  | 'PARTY'
  | 'GAME'
  | 'CONTEXTUAL'
  | 'EDITORIAL'
  | 'NEUTRAL';

export interface RecommendationReason {
  code: ReasonCode;
  message: string;
  /** 0–1. */
  confidence: number;
  scope: EvidenceScope;
}

/** A breakdown of what drove the score — for the "explain the ranking" panel. */
export interface ScoreComponent {
  label: string;
  value: number;
}

export interface Recommendation {
  game: Game;
  /** Final 0–1 score after blending + re-ranking. */
  score: number;
  reason: RecommendationReason;
  components: ScoreComponent[];
}

export type RowStrategy =
  // Cold Hub
  | 'recommended_for_you'
  | 'recently_played'
  | 'new_this_week'
  | 'trending'
  | 'hidden_gems'
  // Warm Hub
  | 'keep_party_going'
  | 'more_for_n'
  | 'because_you_played'
  | 'genre_continuation'
  | 'try_a_team_game';

export interface Row {
  id: string;
  title: string;
  strategy: RowStrategy;
  /** Where this row's evidence comes from (drives the UI badge). */
  scope: EvidenceScope;
  subtitle: string;
  items: Recommendation[];
}

export type HubState = 'cold' | 'warm';

export interface HubResult {
  state: HubState;
  rows: Row[];
  /** 0–1 overall profile confidence used for blending. */
  confidence: number;
}
