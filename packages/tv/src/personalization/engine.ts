// ─────────────────────────────────────────────────────────────────────────
//  Recommendation engine — rule-based, deterministic, explainable.
//
//  Implements the two-mode pipeline from the strategy doc:
//    Cold Hub  — party unknown; rank on long-term taste + household + recency.
//    Warm Hub  — party known; add party fit, previous-game similarity, etc.
//
//  Pipeline per row:  candidate generation → scoring → confidence blend →
//                     re-ranking (eligibility, fatigue, diversity, dedup) →
//                     reason selection.
// ─────────────────────────────────────────────────────────────────────────

import type {
  Game,
  Genre,
  HouseholdProfile,
  HubResult,
  PlayerProfile,
  Recommendation,
  RecommendationReason,
  Row,
  ScoreComponent,
  SessionContext,
} from './types';
import { bandForCount } from './types';
import { profileStats } from './profile';

// ── Tunable policy weights (would live in policy config in production) ──────

export const COLD_WEIGHTS = {
  taste: 0.34,
  engagement: 0.2,
  satisfaction: 0.12,
  recentIntent: 0.1,
  discovery: 0.08,
  novelty: 0.06,
  editorial: 0.06,
  fatigue: 0.18, // subtracted
  avoidance: 0.25, // subtracted
};

export const WARM_WEIGHTS = {
  taste: 0.2,
  partyFit: 0.28,
  previousSimilarity: 0.18,
  groupEnjoyment: 0.14,
  durationFit: 0.1,
  novelty: 0.05,
  fatigue: 0.15, // subtracted
  avoidance: 0.25, // subtracted
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// ── Similarity & affinity primitives ───────────────────────────────────────

function jaccard<T>(a: T[], b: T[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  sa.forEach((x) => {
    if (sb.has(x)) inter++;
  });
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

/** Metadata similarity between two games, 0–1. */
export function gameSimilarity(a: Game, b: Game): number {
  const genre = a.genre === b.genre ? 1 : 0;
  const themes = jaccard(a.themes, b.themes);
  const motiv = jaccard(a.motivations, b.motivations);
  const inter = jaccard(a.interactions, b.interactions);
  const comp = jaccard(a.competition, b.competition);
  const coop = jaccard(a.cooperation, b.cooperation);
  return clamp01(0.34 * genre + 0.22 * motiv + 0.18 * themes + 0.14 * inter + 0.06 * comp + 0.06 * coop);
}

/** Long-term taste match of a player for a game, 0–1. */
export function tasteAffinity(profile: PlayerProfile, game: Game): number {
  const genre = profile.genreAffinity[game.genre] ?? 0;
  const motiv = avg(game.motivations.map((m) => profile.motivationAffinity[m] ?? 0));
  const inter = avg(game.interactions.map((it) => profile.interactionPref[it] ?? 0));
  const aud = avg(game.audiences.map((a) => profile.audiencePref[a] ?? 0));
  // interaction pref is -1..1; fold into 0..1 for the positive contribution.
  const interPos = clamp01((inter + 1) / 2);
  return clamp01(0.45 * genre + 0.28 * motiv + 0.15 * interPos + 0.12 * aud);
}

/** Penalty (0–1) when a game leans on an interaction the player avoids. */
function avoidancePenalty(profile: PlayerProfile, game: Game): number {
  let worst = 0;
  for (const it of game.interactions) {
    const pref = profile.interactionPref[it] ?? 0;
    if (pref < 0) worst = Math.max(worst, -pref);
    if (profile.avoidedInteractions.includes(it)) worst = Math.max(worst, 0.8);
  }
  // Required (not just supported) interactions weigh more heavily.
  if (game.cameraRequired && (profile.interactionPref.Camera ?? 0) < 0) worst = Math.max(worst, 0.9);
  if (game.voiceRequired && (profile.interactionPref.Voice ?? 0) < 0) worst = Math.max(worst, 0.9);
  return clamp01(worst);
}

function recencyWeight(daysAgo: number | null): number {
  if (daysAgo == null) return 0;
  // Half-life ~14 days.
  return clamp01(Math.pow(0.5, daysAgo / 14));
}

function contextualPopularity(game: Game): number {
  return clamp01(0.7 * game.trending + 0.3 * game.editorial);
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// ── Party compatibility ─────────────────────────────────────────────────────

export function partyCompatible(game: Game, activePlayers: number): boolean {
  return activePlayers >= game.minPlayers && activePlayers <= game.maxPlayers;
}

function bandRecommended(game: Game, activePlayers: number): boolean {
  return game.recommendedBands.includes(bandForCount(activePlayers));
}

// ── Scoring ─────────────────────────────────────────────────────────────────

interface Scored {
  game: Game;
  score: number;
  components: ScoreComponent[];
}

export function coldScore(profile: PlayerProfile, game: Game, confidence: number): Scored {
  const f = profile.perGame[game.id];
  const taste = tasteAffinity(profile, game);
  const engagement = f?.engagement ?? 0;
  const satisfaction = f?.satisfaction ?? 0;
  const recentIntent = f ? recencyWeight(f.lastPlayedDaysAgo) * engagement : 0;
  const played = !!f && f.playCount > 0;
  const discovery = !played ? taste : 0; // high-affinity unplayed
  const novelty = game.lifecycle === 'New' ? profile.noveltyReceptivity : 0;
  const editorial = game.editorial;
  const fatigue = f?.fatigue ?? 0;
  const avoidance = avoidancePenalty(profile, game);

  const w = COLD_WEIGHTS;
  const personalized =
    w.taste * taste +
    w.engagement * engagement +
    w.satisfaction * satisfaction +
    w.recentIntent * recentIntent +
    w.discovery * discovery +
    w.novelty * novelty +
    w.editorial * editorial -
    w.fatigue * fatigue -
    w.avoidance * avoidance;

  // Confidence blend with contextual popularity for sparse profiles.
  const pop = contextualPopularity(game);
  const blended = confidence * personalized + (1 - confidence) * pop;
  const score = clamp01(blended);

  const components: ScoreComponent[] = [
    { label: 'Taste affinity', value: round(w.taste * taste) },
    { label: 'Engagement', value: round(w.engagement * engagement) },
    { label: 'Satisfaction', value: round(w.satisfaction * satisfaction) },
    { label: 'Recent intent', value: round(w.recentIntent * recentIntent) },
    { label: 'Discovery', value: round(w.discovery * discovery) },
    { label: 'Novelty', value: round(w.novelty * novelty) },
    { label: 'Editorial', value: round(w.editorial * editorial) },
    { label: 'Fatigue', value: -round(w.fatigue * fatigue) },
    { label: 'Avoided interaction', value: -round(w.avoidance * avoidance) },
    { label: `Popularity blend (conf ${confidence.toFixed(2)})`, value: round((1 - confidence) * pop) },
  ].filter((c) => Math.abs(c.value) > 0.001);

  return { game, score, components };
}

export function warmScore(
  profile: PlayerProfile,
  household: HouseholdProfile,
  game: Game,
  ctx: SessionContext,
  prev: Game | undefined,
  confidence: number,
): Scored {
  const f = profile.perGame[game.id];
  const taste = tasteAffinity(profile, game);
  const partyFit = partyCompatible(game, ctx.activePlayerCount)
    ? bandRecommended(game, ctx.activePlayerCount)
      ? 1
      : 0.6
    : 0;
  const prevSim = prev ? gameSimilarity(prev, game) : 0;
  // Group enjoyment leans on household family-friendliness + audience fit.
  const audienceFit = avg(game.audiences.map((a) => profile.audiencePref[a] ?? 0));
  const groupEnjoyment = clamp01(0.5 * audienceFit + 0.5 * (game.audiences.includes('Family') ? household.familyFriendly : 1 - household.familyFriendly * 0.4));
  const durationFit = durationMatch(game.typicalSessionMin, profile.avgSessionMin);
  const novelty = game.lifecycle === 'New' ? profile.noveltyReceptivity : 0;
  const fatigue = f?.fatigue ?? 0;
  const avoidance = avoidancePenalty(profile, game);

  const w = WARM_WEIGHTS;
  const personalized =
    w.taste * taste +
    w.partyFit * partyFit +
    w.previousSimilarity * prevSim +
    w.groupEnjoyment * groupEnjoyment +
    w.durationFit * durationFit +
    w.novelty * novelty -
    w.fatigue * fatigue -
    w.avoidance * avoidance;

  const pop = contextualPopularity(game);
  const blended = confidence * personalized + (1 - confidence) * pop;
  const score = clamp01(blended);

  const components: ScoreComponent[] = [
    { label: 'Taste affinity', value: round(w.taste * taste) },
    { label: `Party fit (${ctx.activePlayerCount}p)`, value: round(w.partyFit * partyFit) },
    { label: 'Previous-game similarity', value: round(w.previousSimilarity * prevSim) },
    { label: 'Group enjoyment', value: round(w.groupEnjoyment * groupEnjoyment) },
    { label: 'Session-length fit', value: round(w.durationFit * durationFit) },
    { label: 'Novelty', value: round(w.novelty * novelty) },
    { label: 'Fatigue', value: -round(w.fatigue * fatigue) },
    { label: 'Avoided interaction', value: -round(w.avoidance * avoidance) },
  ].filter((c) => Math.abs(c.value) > 0.001);

  return { game, score, components };
}

function durationMatch(gameMin: number, prefMin: number): number {
  const diff = Math.abs(gameMin - prefMin);
  return clamp01(1 - diff / 30);
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

// ── Reason selection (evidence-gated) ───────────────────────────────────────

function coldReason(
  profile: PlayerProfile,
  game: Game,
  confidence: number,
): RecommendationReason {
  const f = profile.perGame[game.id];
  const taste = tasteAffinity(profile, game);

  // Similar to a named favorite?
  if (profile.favoriteGameIds.length && confidence > 0.25) {
    const favGenreMatch = profile.favoriteGameIds.some((id) => id !== game.id);
    if (favGenreMatch && taste > 0.55 && !f) {
      return reason(
        'SIMILAR_TO_FAVORITE',
        `Because you've been enjoying ${game.genre.toLowerCase()} games.`,
        round(0.6 + taste * 0.3),
        'PROFILE',
      );
    }
  }
  if (game.lifecycle === 'New' && (taste > 0.4 || profile.noveltyReceptivity > 0.6)) {
    return reason('NEW_RELEASE_MATCH', `New this week — and matched to your taste.`, round(0.55 + taste * 0.3), 'EDITORIAL');
  }
  if (!f && taste > 0.55) {
    return reason('UNDEREXPOSED_MATCH', `A ${game.genre.toLowerCase()} game you may have missed.`, round(0.5 + taste * 0.35), 'PROFILE');
  }
  if (f && f.playCount > 0 && (f.lastPlayedDaysAgo ?? 999) > 30 && f.satisfaction > 0.6) {
    return reason('REACTIVATION', `You used to enjoy this — worth another round.`, 0.6, 'PROFILE');
  }
  if (confidence > 0.3 && taste > 0.35) {
    return reason('TAXONOMY_AFFINITY', `Because you like ${game.genre.toLowerCase()} games.`, round(0.5 + taste * 0.3), 'PROFILE');
  }
  if (confidence < 0.25) {
    return reason('CONTEXTUAL_POPULARITY', `Popular with Weekend players.`, round(0.5 + game.trending * 0.3), 'CONTEXTUAL');
  }
  return reason('NEUTRAL_RECOMMENDATION', `Recommended for you.`, 0.45, 'NEUTRAL');
}

// Warm-mode reason for a single game, independent of any row bucket — used by
// the "All Games" grid so every tile can explain its warm ranking.
function warmReason(
  profile: PlayerProfile,
  game: Game,
  ctx: SessionContext,
  prev: Game | undefined,
): RecommendationReason {
  const n = ctx.activePlayerCount;
  if (!partyCompatible(game, n)) {
    return reason('PARTY_SIZE_MATCH', `Needs ${game.minPlayers}–${game.maxPlayers} players — not a fit for ${n}.`, 0.3, 'PARTY');
  }
  const prevSim = prev ? gameSimilarity(prev, game) : 0;
  if (prev && prevSim > 0.35) {
    return reason('PREVIOUS_GAME_SIMILARITY', `Because your group played ${prev.title}.`, round(0.6 + prevSim * 0.35), 'PARTY');
  }
  if (bandRecommended(game, n)) {
    return reason('PARTY_SIZE_MATCH', `Made for ${bandLabel(n)}.`, round(0.7 + tasteAffinity(profile, game) * 0.2), 'PARTY');
  }
  const taste = tasteAffinity(profile, game);
  if (taste > 0.4) {
    return reason('TAXONOMY_AFFINITY', `Matches your taste and works for ${n}.`, round(0.5 + taste * 0.3), 'PROFILE');
  }
  return reason('CONTEXTUAL_POPULARITY', `Works for your group of ${n}.`, round(0.5 + game.trending * 0.3), 'CONTEXTUAL');
}

function reason(
  code: RecommendationReason['code'],
  message: string,
  confidence: number,
  scope: RecommendationReason['scope'],
): RecommendationReason {
  return { code, message, confidence: clamp01(confidence), scope };
}

// ── Row assembly helpers ────────────────────────────────────────────────────

function toRec(s: Scored, r: RecommendationReason): Recommendation {
  return { game: s.game, score: s.score, reason: r, components: s.components };
}

/** Cap same-genre concentration in a row to protect variety. */
function diversify(items: Recommendation[], maxPerGenre: number, limit: number): Recommendation[] {
  const counts: Partial<Record<Genre, number>> = {};
  const out: Recommendation[] = [];
  for (const it of items) {
    const g = it.game.genre;
    const c = counts[g] ?? 0;
    if (c >= maxPerGenre) continue;
    counts[g] = c + 1;
    out.push(it);
    if (out.length >= limit) break;
  }
  // If diversity trimming left us short, backfill from the remainder.
  if (out.length < limit) {
    for (const it of items) {
      if (out.includes(it)) continue;
      out.push(it);
      if (out.length >= limit) break;
    }
  }
  return out;
}

// ── Public: build the hub ───────────────────────────────────────────────────

const ROW_LIMIT = 8;

export function buildColdHub(
  profile: PlayerProfile,
  _household: HouseholdProfile,
  library: Game[],
): HubResult {
  const stats = profileStats(profile, library);
  const confidence = stats.confidence;
  const scored = library.map((g) => coldScore(profile, g, confidence));
  const byId = new Map(scored.map((s) => [s.game.id, s]));

  const rows: Row[] = [];

  // Recommended For You
  const recItems = diversify(
    [...scored].sort((a, b) => b.score - a.score).map((s) => toRec(s, coldReason(profile, s.game, confidence))),
    3,
    ROW_LIMIT,
  );
  pushRow(rows, {
    id: 'recommended_for_you',
    title: 'Recommended For You',
    strategy: 'recommended_for_you',
    scope: confidence > 0.25 ? 'PROFILE' : 'CONTEXTUAL',
    subtitle: 'Highest overall predicted interest',
    items: recItems,
  }, 2);

  // Recently Played
  const recentItems = library
    .filter((g) => (profile.perGame[g.id]?.lastPlayedDaysAgo ?? null) != null)
    .sort((a, b) => (profile.perGame[a.id]!.lastPlayedDaysAgo! - profile.perGame[b.id]!.lastPlayedDaysAgo!))
    .map((g) => toRec(byId.get(g.id)!, reason('RECENTLY_PLAYED', `Play again`, 0.8, 'GAME')))
    .slice(0, ROW_LIMIT);
  pushRow(rows, {
    id: 'recently_played',
    title: 'Recently Played',
    strategy: 'recently_played',
    scope: 'GAME',
    subtitle: 'Quick access to your recent titles',
    items: recentItems,
  }, 2);

  // New This Week
  const newItems = library
    .filter((g) => g.lifecycle === 'New')
    .map((g) => byId.get(g.id)!)
    .sort((a, b) => b.score - a.score)
    .map((s) => toRec(s, reason('NEW_RELEASE_MATCH', `New this week`, round(0.55 + s.score * 0.3), 'EDITORIAL')))
    .slice(0, ROW_LIMIT);
  pushRow(rows, {
    id: 'new_this_week',
    title: 'New This Week',
    strategy: 'new_this_week',
    scope: 'EDITORIAL',
    subtitle: 'Fresh releases, promoted',
    items: newItems,
  }, 2);

  // Trending
  const trendingItems = [...library]
    .sort((a, b) => b.trending - a.trending)
    .map((g) => toRec(byId.get(g.id)!, reason('CONTEXTUAL_POPULARITY', `Popular with Weekend players`, round(0.5 + g.trending * 0.4), 'CONTEXTUAL')))
    .slice(0, ROW_LIMIT);
  pushRow(rows, {
    id: 'trending',
    title: 'Trending',
    strategy: 'trending',
    scope: 'CONTEXTUAL',
    subtitle: 'Community popularity',
    items: trendingItems,
  }, 2);

  // Hidden Gems — high affinity, low exposure
  const gemItems = library
    .filter((g) => !(profile.perGame[g.id]?.playCount))
    .map((g) => ({ g, taste: tasteAffinity(profile, g) }))
    .filter((x) => x.taste > 0.35)
    .sort((a, b) => b.taste - a.taste)
    .map((x) => toRec(byId.get(x.g.id)!, reason('UNDEREXPOSED_MATCH', `A ${x.g.genre.toLowerCase()} game you may have missed`, round(0.5 + x.taste * 0.35), 'PROFILE')))
    .slice(0, ROW_LIMIT);
  pushRow(rows, {
    id: 'hidden_gems',
    title: 'Hidden Gems',
    strategy: 'hidden_gems',
    scope: 'PROFILE',
    subtitle: 'Discovery — relevant games you haven’t tried',
    items: gemItems,
  }, 2);

  return { state: 'cold', rows, confidence };
}

export function buildWarmHub(
  profile: PlayerProfile,
  household: HouseholdProfile,
  library: Game[],
  ctx: SessionContext,
): HubResult {
  const stats = profileStats(profile, library);
  const confidence = stats.confidence;
  const prev = library.find((g) => g.id === ctx.previousGameId);
  const scored = library.map((g) => warmScore(profile, household, g, ctx, prev, confidence));
  const byId = new Map(scored.map((s) => [s.game.id, s]));
  const n = ctx.activePlayerCount;

  const rows: Row[] = [];

  const partyPool = library.filter((g) => partyCompatible(g, n));

  // Keep the Party Going — only meaningful for an actual party (2+ players).
  if (n >= 2) {
    const keepItems = diversify(
      partyPool
        .map((g) => byId.get(g.id)!)
        .sort((a, b) => b.score - a.score)
        .map((s) =>
          toRec(
            s,
            reason('PARTY_SIZE_MATCH', `Great for your group of ${n}.`, round(0.7 + s.score * 0.25), 'PARTY'),
          ),
        ),
      3,
      ROW_LIMIT,
    );
    pushRow(rows, {
      id: 'keep_party_going',
      title: 'Keep the Party Going',
      strategy: 'keep_party_going',
      scope: 'PARTY',
      subtitle: `Games that fit your current party`,
      items: keepItems,
    }, 2);
  }

  // More for N Players — strict band recommendation
  const moreItems = partyPool
    .filter((g) => bandRecommended(g, n))
    .map((g) => byId.get(g.id)!)
    .sort((a, b) => b.score - a.score)
    .map((s) => toRec(s, reason('PARTY_SIZE_MATCH', `Made for ${bandLabel(n)}.`, round(0.75 + s.score * 0.2), 'PARTY')))
    .slice(0, ROW_LIMIT);
  pushRow(rows, {
    id: 'more_for_n',
    title: `More for ${bandLabel(n)}`,
    strategy: 'more_for_n',
    scope: 'PARTY',
    subtitle: 'Party-size recommendations',
    items: moreItems,
  }, 2);

  // Because You Played X — similarity to previous game
  if (prev) {
    const simItems = library
      .filter((g) => g.id !== prev.id && partyCompatible(g, n))
      .map((g) => ({ g, sim: gameSimilarity(prev, g) }))
      .filter((x) => x.sim > 0.2)
      .sort((a, b) => b.sim - a.sim)
      .map((x) => toRec(byId.get(x.g.id)!, reason('PREVIOUS_GAME_SIMILARITY', `Because your group played ${prev.title}.`, round(0.6 + x.sim * 0.35), 'PARTY')))
      .slice(0, ROW_LIMIT);
    pushRow(rows, {
      id: 'because_you_played',
      title: `Because You Played ${prev.title}`,
      strategy: 'because_you_played',
      scope: 'PARTY',
      subtitle: 'Content similarity',
      items: simItems,
    }, 2);

    // Another <Genre> Game — genre continuation
    const genreItems = library
      .filter((g) => g.id !== prev.id && g.genre === prev.genre && partyCompatible(g, n))
      .map((g) => byId.get(g.id)!)
      .sort((a, b) => b.score - a.score)
      .map((s) => toRec(s, reason('GENRE_CONTINUATION', `Keep the ${prev.genre.toLowerCase()} going.`, round(0.6 + s.score * 0.3), 'PARTY')))
      .slice(0, ROW_LIMIT);
    pushRow(rows, {
      id: 'genre_continuation',
      title: `Another ${prev.genre} Game`,
      strategy: 'genre_continuation',
      scope: 'GAME',
      subtitle: 'Genre continuation',
      items: genreItems,
    }, 2);
  }

  // Try a Team Game — session expansion (needs an actual group).
  const teamItems = n < 2
    ? []
    : library
        .filter((g) => (g.competition.includes('Team') || g.cooperation.includes('TeamCoop')) && partyCompatible(g, n))
        .map((g) => byId.get(g.id)!)
        .sort((a, b) => b.score - a.score)
        .map((s) => toRec(s, reason('TEAM_GAME', `Team up for the next round.`, round(0.6 + s.score * 0.3), 'PARTY')))
        .slice(0, ROW_LIMIT);
  pushRow(rows, {
    id: 'try_a_team_game',
    title: 'Try a Team Game',
    strategy: 'try_a_team_game',
    scope: 'PARTY',
    subtitle: 'Session expansion',
    items: teamItems,
  }, 2);

  // Lower-priority general rows (the Cold-hub set) beneath the party rows, so
  // there's always broader discovery below the party-specific picks.
  const general = buildColdHub(profile, household, library).rows;
  rows.push(...general);

  return { state: 'warm', rows, confidence };
}

/**
 * Rank the ENTIRE catalog by overall predicted interest — no row bucketing, no
 * diversity trimming, no per-row limit. Powers the "All Games" grid, so the full
 * library visibly reorders as the profile / party context changes.
 *
 * Pass `ctx` to rank in Warm mode (party-aware scoring); pass `null` for Cold.
 */
export function rankAllGames(
  profile: PlayerProfile,
  household: HouseholdProfile,
  library: Game[],
  ctx: SessionContext | null,
): { items: Recommendation[]; confidence: number } {
  const confidence = profileStats(profile, library).confidence;

  if (ctx) {
    const prev = library.find((g) => g.id === ctx.previousGameId);
    const items = library
      .map((g) => warmScore(profile, household, g, ctx, prev, confidence))
      .sort((a, b) => b.score - a.score)
      .map((s) => toRec(s, warmReason(profile, s.game, ctx, prev)));
    return { items, confidence };
  }

  const items = library
    .map((g) => coldScore(profile, g, confidence))
    .sort((a, b) => b.score - a.score)
    .map((s) => toRec(s, coldReason(profile, s.game, confidence)));
  return { items, confidence };
}

// ── internals ───────────────────────────────────────────────────────────────

function bandLabel(n: number): string {
  const band = bandForCount(n);
  if (band === '1') return '1 Player';
  if (band === '5+') return '5+ Players';
  return `${n} Players`;
}

function pushRow(rows: Row[], row: Row, minItems: number): void {
  if (row.items.length >= minItems) rows.push(row);
}
