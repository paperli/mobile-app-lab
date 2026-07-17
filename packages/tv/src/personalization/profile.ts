// ─────────────────────────────────────────────────────────────────────────
//  Profile generation — personas, empty profiles, and derived aggregates.
//
//  The simulator "Generate" button builds a persona: an archetype biases the
//  genre / motivation affinities and party-size habits, then a plausible play
//  history (per-game engagement, recency, favorites, play counts) is
//  simulated so the recommendation rows have something to work with.
// ─────────────────────────────────────────────────────────────────────────

import type {
  Audience,
  Game,
  GameFeature,
  Genre,
  HouseholdProfile,
  Interaction,
  Motivation,
  PlayerBand,
  PlayerProfile,
} from './types';
import { AUDIENCES, GENRES, INTERACTIONS, MOTIVATIONS, PLAYER_BANDS, bandForCount } from './types';

// ── small helpers ─────────────────────────────────────────────────────────

const rand = () => Math.random();
const between = (lo: number, hi: number) => lo + rand() * (hi - lo);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const round2 = (n: number) => Math.round(n * 100) / 100;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function zeros<K extends string>(keys: readonly K[]): Record<K, number> {
  return keys.reduce((acc, k) => {
    acc[k] = 0;
    return acc;
  }, {} as Record<K, number>);
}

// ── Personas ──────────────────────────────────────────────────────────────

interface Persona {
  label: string;
  genres: Genre[];
  motivations: Motivation[];
  interactions: Interaction[];
  avoid: Interaction[];
  audience: Audience;
  bands: PlayerBand[];
  avgSession: [number, number];
  novelty: [number, number];
  household: [number, number]; // avg party size range
}

const PERSONAS: Persona[] = [
  {
    label: 'Trivia Buff',
    genres: ['Trivia', 'Word'],
    motivations: ['Knowledge', 'Mastery', 'Social Competition'],
    interactions: ['Buzzer', 'Voice'],
    avoid: ['Camera'],
    audience: 'Adults',
    bands: ['1', '2'],
    avgSession: [18, 28],
    novelty: [0.2, 0.5],
    household: [1.5, 2.5],
  },
  {
    label: 'Party Host',
    genres: ['Party', 'Music', 'Trivia'],
    motivations: ['Social Cooperation', 'Social Competition', 'Performance'],
    interactions: ['Voice', 'Buzzer', 'Camera'],
    avoid: [],
    audience: 'Adults',
    bands: ['3-4', '5+'],
    avgSession: [20, 35],
    novelty: [0.5, 0.85],
    household: [4, 6],
  },
  {
    label: 'Family Household',
    genres: ['Kids', 'Party', 'Music'],
    motivations: ['Social Cooperation', 'Creativity', 'Relaxation'],
    interactions: ['Touch', 'Voice'],
    avoid: [],
    audience: 'Family',
    bands: ['2', '3-4'],
    avgSession: [12, 22],
    novelty: [0.3, 0.6],
    household: [3, 4.5],
  },
  {
    label: 'Solo Puzzler',
    genres: ['Puzzle', 'Word', 'Strategy'],
    motivations: ['Mastery', 'Relaxation'],
    interactions: ['Touch'],
    avoid: ['Camera', 'Voice'],
    audience: 'Adults',
    bands: ['1'],
    avgSession: [10, 18],
    novelty: [0.15, 0.4],
    household: [1, 2],
  },
  {
    label: 'Music Lover',
    genres: ['Music', 'Party'],
    motivations: ['Performance', 'Creativity', 'Knowledge'],
    interactions: ['Voice'],
    avoid: [],
    audience: 'Adults',
    bands: ['2', '3-4'],
    avgSession: [15, 28],
    novelty: [0.4, 0.75],
    household: [2, 4],
  },
  {
    label: 'Active Gamer',
    genres: ['Action', 'Music', 'Party'],
    motivations: ['Performance', 'Mastery', 'Social Competition'],
    interactions: ['Gyro', 'Camera'],
    avoid: [],
    audience: 'Adults',
    bands: ['1', '2', '3-4'],
    avgSession: [12, 20],
    novelty: [0.5, 0.9],
    household: [2, 4],
  },
];

// ── Empty / clean profile ──────────────────────────────────────────────────

export function emptyProfile(): PlayerProfile {
  const bands = zeros(PLAYER_BANDS);
  // A clean profile still has a mild prior: solo/duo is the safe default.
  bands['1'] = 0.4;
  bands['2'] = 0.35;
  bands['3-4'] = 0.2;
  bands['5+'] = 0.05;
  return {
    id: 'clean',
    label: 'Clean profile (no history)',
    genreAffinity: zeros(GENRES),
    motivationAffinity: zeros(MOTIVATIONS),
    interactionPref: zeros(INTERACTIONS),
    avoidedInteractions: [],
    audiencePref: { Kids: 0.2, Family: 0.34, Adults: 0.34 },
    favoriteGameIds: [],
    partySizeDistribution: bands,
    avgSessionMin: 15,
    noveltyReceptivity: 0.5,
    perGame: {},
  };
}

export function emptyHousehold(): HouseholdProfile {
  return {
    avgPartySize: 2,
    familyFriendly: 0.5,
    weekendPlayer: 0.5,
    transitions: {},
  };
}

// ── Random persona-driven profile ──────────────────────────────────────────

export function randomProfile(library: Game[]): {
  profile: PlayerProfile;
  household: HouseholdProfile;
} {
  const persona = pick(PERSONAS);

  // Genre affinity: strong for the persona's genres, faint noise elsewhere.
  const genreAffinity = zeros(GENRES);
  for (const g of GENRES) genreAffinity[g] = round2(between(0.02, 0.18));
  persona.genres.forEach((g, i) => {
    genreAffinity[g] = round2(clamp01(between(0.65, 0.95) - i * 0.08));
  });

  // Motivation affinity.
  const motivationAffinity = zeros(MOTIVATIONS);
  for (const m of MOTIVATIONS) motivationAffinity[m] = round2(between(0.05, 0.25));
  persona.motivations.forEach((m, i) => {
    motivationAffinity[m] = round2(clamp01(between(0.6, 0.92) - i * 0.06));
  });

  // Interaction preference.
  const interactionPref = zeros(INTERACTIONS);
  for (const it of INTERACTIONS) interactionPref[it] = round2(between(-0.1, 0.2));
  persona.interactions.forEach((it) => {
    interactionPref[it] = round2(between(0.5, 0.9));
  });
  persona.avoid.forEach((it) => {
    interactionPref[it] = round2(between(-0.9, -0.5));
  });

  // Audience preference.
  const audiencePref = zeros(AUDIENCES);
  for (const a of AUDIENCES) audiencePref[a] = round2(between(0.1, 0.35));
  audiencePref[persona.audience] = round2(between(0.7, 0.95));
  if (persona.audience === 'Family') audiencePref['Kids'] = round2(between(0.4, 0.7));

  // Party-size distribution centered on the persona's bands.
  const partySizeDistribution = zeros(PLAYER_BANDS);
  for (const b of PLAYER_BANDS) partySizeDistribution[b] = between(0.02, 0.1);
  persona.bands.forEach((b, i) => {
    partySizeDistribution[b] = between(0.4, 0.7) - i * 0.05;
  });
  normalize(partySizeDistribution);

  // Simulate a play history biased toward the persona's genres.
  const perGame: Record<string, GameFeature> = {};
  const favoriteGameIds: string[] = [];
  const scored = library
    .map((game) => ({ game, fit: genreAffinity[game.genre] + rand() * 0.3 }))
    .sort((a, b) => b.fit - a.fit);

  const historyCount = Math.min(scored.length, Math.round(between(4, 10)));
  scored.slice(0, historyCount).forEach(({ game }, idx) => {
    const strong = idx < 3;
    const engagement = clamp01(strong ? between(0.6, 0.95) : between(0.25, 0.6));
    const satisfaction = clamp01(engagement + between(-0.15, 0.1));
    const playCount = strong ? Math.round(between(4, 20)) : Math.round(between(1, 5));
    const lastPlayedDaysAgo = Math.round(between(0, strong ? 25 : 90));
    perGame[game.id] = {
      engagement: round2(engagement),
      satisfaction: round2(satisfaction),
      lastPlayedDaysAgo,
      playCount,
      fatigue: round2(clamp01(playCount > 12 ? between(0.3, 0.7) : between(0, 0.25))),
    };
    if (strong && satisfaction > 0.7 && favoriteGameIds.length < 3) {
      favoriteGameIds.push(game.id);
    }
  });

  const profile: PlayerProfile = {
    id: `p_${Math.floor(rand() * 1e6).toString(36)}`,
    label: persona.label,
    genreAffinity,
    motivationAffinity,
    interactionPref,
    avoidedInteractions: [...persona.avoid],
    audiencePref,
    favoriteGameIds,
    partySizeDistribution: mapRound(partySizeDistribution),
    avgSessionMin: Math.round(between(persona.avgSession[0], persona.avgSession[1])),
    noveltyReceptivity: round2(between(persona.novelty[0], persona.novelty[1])),
    perGame,
  };

  const household: HouseholdProfile = {
    avgPartySize: round2(between(persona.household[0], persona.household[1])),
    familyFriendly: round2(
      persona.audience === 'Family'
        ? between(0.6, 0.9)
        : persona.audience === 'Kids'
          ? between(0.7, 0.95)
          : between(0.2, 0.5),
    ),
    weekendPlayer: round2(between(0.4, 0.9)),
    transitions: {},
  };

  return { profile, household };
}

// ── Derived aggregates (for the engine + infographics) ─────────────────────

export interface ProfileStats {
  totalPlays: number;
  gamesPlayed: number;
  favorites: number;
  /** 0–1 confidence in the profile (evidence volume). */
  confidence: number;
  /** Top genres by affinity, sorted desc. */
  topGenres: { genre: Genre; value: number }[];
  /** Most-engaged games, sorted desc. */
  topGames: { game: Game; engagement: number }[];
}

export function profileStats(profile: PlayerProfile, library: Game[]): ProfileStats {
  const byId = new Map(library.map((g) => [g.id, g]));
  const entries = Object.entries(profile.perGame);
  const totalPlays = entries.reduce((s, [, f]) => s + f.playCount, 0);
  const gamesPlayed = entries.length;

  const topGames = entries
    .map(([id, f]) => ({ game: byId.get(id), engagement: f.engagement }))
    .filter((x): x is { game: Game; engagement: number } => !!x.game)
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 6);

  const topGenres = GENRES.map((g) => ({ genre: g, value: profile.genreAffinity[g] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Confidence grows with evidence volume, saturating around ~30 plays.
  const confidence = clamp01(totalPlays / 30) * 0.7 + clamp01(gamesPlayed / 8) * 0.3;

  return {
    totalPlays,
    gamesPlayed,
    favorites: profile.favoriteGameIds.length,
    confidence: round2(confidence),
    topGenres,
    topGames,
  };
}

// ── Simulate a play: update history + learn the profile ─────────────────────

const LR_TASTE = 0.14; // how fast affinities move toward a played game
const LR_PARTY = 0.22; // how fast party-size habits shift

/**
 * Record that the player played `game` with `playerCount` active players.
 * Returns a new profile + household with updated per-game evidence and
 * learned long-term preferences (the profile "changes" as they play).
 */
export function recordPlay(
  profile: PlayerProfile,
  household: HouseholdProfile,
  game: Game,
  playerCount: number,
): { profile: PlayerProfile; household: HouseholdProfile } {
  const p: PlayerProfile = {
    ...profile,
    genreAffinity: { ...profile.genreAffinity },
    motivationAffinity: { ...profile.motivationAffinity },
    interactionPref: { ...profile.interactionPref },
    audiencePref: { ...profile.audiencePref },
    partySizeDistribution: { ...profile.partySizeDistribution },
    favoriteGameIds: [...profile.favoriteGameIds],
    perGame: { ...profile.perGame },
  };

  // Per-game evidence.
  const prev = p.perGame[game.id];
  const playCount = (prev?.playCount ?? 0) + 1;
  const engagement = clamp01((prev?.engagement ?? 0.4) + 0.12 * (1 - (prev?.engagement ?? 0.4)));
  const satisfaction = clamp01((prev?.satisfaction ?? 0.5) + 0.1 * (1 - (prev?.satisfaction ?? 0.5)));
  p.perGame[game.id] = {
    engagement: round2(engagement),
    satisfaction: round2(satisfaction),
    lastPlayedDaysAgo: 0,
    playCount,
    fatigue: round2(clamp01((prev?.fatigue ?? 0) + 0.07)),
  };

  // Learn taste toward the game's tags.
  p.genreAffinity[game.genre] = round2(clamp01(p.genreAffinity[game.genre] + LR_TASTE * (1 - p.genreAffinity[game.genre])));
  for (const m of game.motivations) {
    p.motivationAffinity[m] = round2(clamp01(p.motivationAffinity[m] + LR_TASTE * (1 - p.motivationAffinity[m])));
  }
  for (const it of game.interactions) {
    p.interactionPref[it] = round2(clamp01(p.interactionPref[it] + LR_TASTE * (1 - p.interactionPref[it])));
  }
  for (const a of game.audiences) {
    p.audiencePref[a] = round2(clamp01(p.audiencePref[a] + LR_TASTE * (1 - p.audiencePref[a])));
  }

  // Party-size habits shift toward the count actually played.
  const band = bandForCount(playerCount);
  for (const b of PLAYER_BANDS) p.partySizeDistribution[b] = p.partySizeDistribution[b] * (1 - LR_PARTY);
  p.partySizeDistribution[band] += LR_PARTY;
  normalize(p.partySizeDistribution);
  p.partySizeDistribution = mapRound(p.partySizeDistribution);

  // Session length + novelty drift.
  p.avgSessionMin = Math.round(profile.avgSessionMin + 0.22 * (game.typicalSessionMin - profile.avgSessionMin));
  if (game.lifecycle === 'New') p.noveltyReceptivity = round2(clamp01(profile.noveltyReceptivity + 0.05 * (1 - profile.noveltyReceptivity)));

  // Earn a favorite once well-played and well-liked.
  if (playCount >= 3 && satisfaction > 0.72 && !p.favoriteGameIds.includes(game.id) && p.favoriteGameIds.length < 5) {
    p.favoriteGameIds.push(game.id);
  }

  // A clean profile becomes a custom one after its first play.
  if (p.id === 'clean' || p.label.startsWith('Clean')) p.label = 'Custom profile';

  // Household follows the group behavior.
  const h: HouseholdProfile = {
    ...household,
    avgPartySize: round2(household.avgPartySize + 0.15 * (playerCount - household.avgPartySize)),
    familyFriendly: round2(
      clamp01(
        household.familyFriendly +
          0.08 * ((game.audiences.includes('Kids') || game.audiences.includes('Family') ? 1 : 0) - household.familyFriendly),
      ),
    ),
    transitions: household.transitions,
  };

  return { profile: p, household: h };
}

// ── internals ───────────────────────────────────────────────────────────────

function normalize(rec: Record<string, number>): void {
  const sum = Object.values(rec).reduce((a, b) => a + b, 0) || 1;
  for (const k of Object.keys(rec)) rec[k] = rec[k] / sum;
}

function mapRound<K extends string>(rec: Record<K, number>): Record<K, number> {
  const out = { ...rec };
  for (const k of Object.keys(out) as K[]) out[k] = round2(out[k]);
  return out;
}
