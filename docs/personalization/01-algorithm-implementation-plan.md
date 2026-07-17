# Recommendation Algorithm — Implementation Plan & Design

This is the plan the simulator's engine was built from. It maps the strategy
doc ([00-personalization-strategy.md](./00-personalization-strategy.md)) onto a
concrete, rule-based, deterministic engine that runs entirely client-side so it
can be demonstrated and iterated in the **Personalization Simulator**
(`packages/tv/src/simulator`, reachable at `?view=simulator` in the hub demo).

The design deliberately targets the doc's **Phase 2 (rule-based)** and
**Phase 3 (context-aware)** — no ML. With a ~30-game catalog the hard part is
signal quality and product policy, not model scale (this matches the companion
PRD/TDD).

---

## 1. Modules

| File | Responsibility |
|------|----------------|
| `personalization/types.ts` | Taxonomy vocabulary, `Game`, `PlayerProfile`, `HouseholdProfile`, `SessionContext`, reason codes, row/result types. |
| `personalization/library.ts` | The hub prototype's 30-game dataset (`HUB_GAMES`) enriched with the taxonomy; tiles render with the hub's generated art. `buildLibrary(size)`. |
| `personalization/profile.ts` | Persona-driven `randomProfile()`, `emptyProfile()`, `profileStats()`, and `recordPlay()` (learns the profile when a game is played). |
| `personalization/engine.ts` | The pipeline: similarity/affinity primitives, cold/warm scoring, reason gating, re-ranking, row assembly. |

## 2. Data model (what the engine consumes)

- **Game metadata** — every core + social dimension from the doc: genre, themes,
  motivations, interactions, difficulty, typical session length, voice/camera/
  physical flags, participation, competition, cooperation, min/max players,
  recommended player bands, audiences, lifecycle, plus `trending` and
  `editorial` merchandising signals.
- **Player profile (long-term)** — genre affinity, motivation affinity,
  interaction preference (−1..1, so avoidance is representable), audience
  preference, favorites, party-size distribution, avg session length, novelty
  receptivity, and per-game evidence (`engagement`, `satisfaction`,
  `lastPlayedDaysAgo`, `playCount`, `fatigue`, `unfinished`).
- **Household profile** — avg party size, family-friendliness, weekend tendency.
  Kept separate from individual taste per the doc's principle.
- **Session context (Warm only)** — previous game, active player count,
  connected phones, mode, session length, day/hour. This is the only thing that
  unlocks Warm behavior; the Cold hub never sees a party size.

## 3. Pipeline (per the doc's Stage 1 → 2 → re-rank)

**Stage 1 — Candidate generation.** With a small catalog every eligible game
enters ranking, but each row selects candidates by a source (recent / similar /
new / trending / underexposed / party-compatible …) which drives its reason.

**Stage 2 — Ranking.** A transparent weighted sum (weights live in
`COLD_WEIGHTS` / `WARM_WEIGHTS`, editable for iteration):

```
cold  = w_taste·taste + w_engagement·engagement + w_satisfaction·sat
      + w_intent·recentIntent + w_discovery·discovery + w_novelty·novelty
      + w_editorial·editorial − w_fatigue·fatigue − w_avoidance·avoidance
warm  = w_taste·taste + w_party·partyFit + w_prev·prevSimilarity
      + w_group·groupEnjoyment + w_duration·durationFit + w_novelty·novelty
      − w_fatigue·fatigue − w_avoidance·avoidance
```

Key primitives:
- `tasteAffinity` — blends genre / motivation / interaction / audience affinity.
- `gameSimilarity` — Jaccard over genre, themes, motivations, interactions,
  competition, cooperation (drives "Because you played…").
- `recencyWeight` — exponential decay, ~14-day half-life (recent intent).
- `partyCompatible` / `bandRecommended` — hard player-count gates for Warm.

**Confidence blending** (cold-start handling): sparse profiles blend toward
contextual popularity —
`blended = confidence·personalized + (1−confidence)·popularity`. Confidence
grows with evidence volume and low-confidence profiles get neutral reasons.

**Re-ranking.** Genre-diversity cap per row (protect variety), min-row-size
(omit thin rows), and party-size hard filters on party-specific Warm rows.

## 4. Rows produced

- **Cold:** Recommended For You · Recently Played · New This Week · Trending ·
  Hidden Gems. (No "Continue Playing" — Weekend's party/trivia sessions are
  discrete, not resumable, so a resume row doesn't fit.)
- **Warm:** Keep the Party Going · More for N Players · Because You Played X ·
  Another _Genre_ Game · Try a Team Game.

Party-specific rows contain **only** games compatible with the active player
count — incompatible games are excluded, not merely penalized (per the doc's
acceptance criteria).

## 5. Explanations (reasons are first-class)

Every recommendation carries a `RecommendationReason` = `{ code, message,
confidence, scope }`, chosen by an evidence gate (e.g. a `PARTY_SIZE_MATCH`
reason is only produced in a valid Warm context; low confidence falls back to
`NEUTRAL_RECOMMENDATION`). The reason drives the tile copy, the row's evidence
badge, and the hover score-breakdown panel — the same explanation surface the
doc wants for UI, analytics, and debugging.

## 6. What the simulator demonstrates

- **Generate / Clean profile** — persona-driven history vs. an empty profile,
  showing cold-start behavior.
- **Library size** — dial the catalog and watch rows/coverage change.
- **Cold ↔ Warm** with party size + previous game — the two operating modes.
- **Play simulation** — click a tile (or a per-player-count button that appears
  on hover) to record a play; `recordPlay()` adds history and re-learns the
  profile live, so the rows + charts update. The collapsible profile section
  keeps the rows reachable immediately.
- **Infographics** (Recharts) — genre-affinity radar, motivation bars,
  party-size donut, interaction-preference diverging bars, most-engaged games,
  and stat tiles (confidence, novelty, favorites, avg session) — so profile
  changes are legible at a glance.
- **How-it-works page** (`?view=how-it-works`, `HowItWorks.tsx`) — the tracking
  events, the event→signal→profile mapping, the learning rules, the live
  ranking weights, and the reason codes, as tables + infographics.

## 7. Not built (future / out of scope for the demo)

Collaborative filtering, learning-to-rank, exploration-vs-exploitation holdouts,
A/B assignment, real telemetry ingestion, and server-validated party-context
tokens. These are the doc's **Phase 4** and the PRD/TDD server architecture —
the rule-based engine is intentionally the substitutable control they compare
against.
