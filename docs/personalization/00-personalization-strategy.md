# Weekend Game Personalization & Recommendation Strategy

> Saved to the project on 2026-07-16. Source: product proposal.
> Companion reference material (external, treated as untrusted input) lives in the
> `Codex/2026-07-16` PRD / TDD / Data-Model docs. This file is the canonical
> product-level proposal that the simulator algorithm is built from.
>
> Implementation lives in `packages/tv/src/personalization/` and is demonstrated
> by the **Personalization Simulator** (`?view=simulator` in the hub demo).

## Vision

Deliver the right game at the right moment by understanding the player's interests, household behavior, and the current gameplay session.

Unlike streaming services, Weekend is recommending the next activity for a living room, not simply the next piece of content.

---

# Goals

- Increase game launches
- Increase games played per session
- Increase discovery of underplayed games
- Improve long-term retention
- Personalize the Hub experience
- Support new game launches without sacrificing personalization

---

# Core Principle

The recommendation engine has two operating modes.

## Cold Hub

The user has just entered the Hub.

At this point we do **not** know:

- How many people are playing
- Which phones will join
- Whether this will be solo or multiplayer

Recommendations are based on:

- Historical preferences
- Household history
- Recent activity
- Time/day
- New releases
- Editorial priorities

---

## Warm Hub

The player has completed a game and returned to the Hub.

Now we know:

- Active player count
- Connected controllers
- Previous game
- Session length
- Recent party behavior

Recommendations can now optimize for the current group.

Examples:

- More for 4 Players
- Keep the Party Going
- Another Trivia Game
- Try a Team Game

---

# Game Metadata

Each game should expose structured metadata.

## Core

- Genre
- Theme
- Difficulty
- Typical session length
- Voice required
- Camera required
- Physical activity

## Social

### Participation

- Solo
- Multiplayer

### Competition

- None
- PvE (vs AI)
- PvP
- Performance

### Cooperation

- None
- Co-op

### Recommended Party Size

- 1
- 2
- 3–4
- 5+

### Audience

- Kids
- Family
- Adults

---

# User Profile

Store long-term preferences instead of only favorite games.

Example:

- Likes trivia
- Likes party games
- Usually plays with 2 players
- Occasionally hosts large parties
- Prefers voice games
- Avoids camera games
- Average session: 18 minutes

---

# Household Profile

Separate household behavior from individual behavior.

Example:

- Frequently plays together on weekends
- Average party size: 4
- Family-friendly games preferred
- Karaoke often follows Song Quiz

---

# Session Context

Session context exists only during an active play session.

```yaml
session_context:
  previous_game:
  active_player_count:
  connected_phones:
  game_mode:
  session_length:
  day_of_week:
  local_time:
```

Session context expires when:

- App closes
- Long inactivity
- Players disconnect
- New party forms

---

# Telemetry

## Hub Events

- Hub Opened
- Row Viewed
- Tile Focused
- Tile Focus Duration
- Tile Selected
- Game Launch Started
- Game Launch Success

---

## Gameplay Events

- Party Formation Started
- Player Joined
- Player Left
- Party Established
- Round Started
- Round Finished
- Game Completed
- Game Exited
- Returned To Hub

---

## Recommendation Events

- Recommendation Row Viewed
- Recommendation Tile Focused
- Recommendation Selected
- Recommendation Played
- Recommendation Ignored

---

# Party Context

Party size is **not known** on initial Hub entry.

It becomes available only after players join a game.

Example:

```yaml
party:
  active_players: 4
  connected_phones: 3
  game_mode: Team Competitive
```

This information is carried back to the Hub after gameplay.

---

# Recommendation Rows

## Cold Hub

### Continue Playing

Resume unfinished games.

### Recommended For You

Highest overall predicted interest.

### Recently Played

Quick access.

### New This Week

Editorial promotion.

### Trending

Community popularity.

### Hidden Gems

Discovery.

---

## Warm Hub

### Keep the Party Going

Games suitable for the current party.

### More for 4 Players

Party-size recommendations.

### Because You Played Song Quiz

Content similarity.

### Another Trivia Game

Genre continuation.

### Try a Team Game

Session expansion.

---

# Recommendation Pipeline

## Stage 1 — Candidate Generation

Collect candidates from:

- Favorites
- Similar games
- Recent games
- New releases
- Trending
- Editorial picks
- Collaborative filtering

---

## Stage 2 — Ranking

Cold Hub ranking:

- Taste affinity
- Historical engagement
- Recent activity
- Discovery
- Novelty
- Launch priority
- Fatigue

Warm Hub ranking:

- Taste affinity
- Current party compatibility
- Previous game similarity
- Expected group enjoyment
- Session length fit
- Novelty
- Fatigue

---

# Recommendation Reasons

Every recommendation should include an explanation.

Example:

```json
{
  "game": "Song Quiz",
  "reason": "party_size",
  "confidence": 0.93,
  "message": "Great for four players."
}
```

Another example:

```json
{
  "game": "Jeopardy!",
  "reason": "similar_game",
  "confidence": 0.88,
  "message": "Because you've been enjoying trivia games."
}
```

Reasons help:

- UI explain recommendations
- Analytics evaluate strategies
- Product tune algorithms
- Engineers debug ranking

---

# Analytics

## Discovery

- Tile Focus Rate
- Average Focus Time
- Tile Selection Rate
- Row CTR
- Hero CTR

## Engagement

- Launch Rate
- Session Length
- Completion Rate
- Return Rate
- Games Per Visit

## Personalization

- Recommendation CTR
- Recommendation Play Rate
- Recommendation Satisfaction
- Recommendation Diversity
- Recommendation Fatigue

---

# Success Metrics

Primary

- Game Launch Rate
- Games Played Per Visit
- Daily Returning Players

Secondary

- New Game Adoption
- Recommendation CTR
- Average Session Length
- Retention
- Discovery Rate

---

# Implementation Roadmap

## Phase 1 — Foundation

- Define game metadata
- Instrument TV Hub
- Instrument gameplay
- Build user profile
- Build household profile

---

## Phase 2 — Rule-Based Recommendations

- Continue Playing
- Recently Played
- New Games
- Trending
- Similar Games

---

## Phase 3 — Context-Aware Personalization

- Cold Hub personalization
- Warm Hub personalization
- Party context
- Household learning
- Recommendation explanations

---

## Phase 4 — Machine Learning

- Collaborative filtering
- Learning-to-rank
- Exploration vs exploitation
- A/B testing
- Continuous optimization
