# Pick Up and Play (PU&P) — Project Context

This directory is the durable context for the Pick Up and Play product vision. Start here when picking up work on this repo.

- **User stories** (narrative, out-of-repo): [Notion doc](https://www.notion.so/Pick-Up-and-Play-User-Stories-321442bc97138118801cd5c7dafe4cfa)
- **Figma**: [Pick Up and Play](https://www.figma.com/design/N3oRN0ITDeCfB9sxcK9TkC/Pick-Up---Play?node-id=3181-128389)
- **PRD**: source of truth for acceptance criteria and configs (linked from Notion)
- **Implementation plan**: [plan.md](./plan.md)
- **Snapshot of user stories (2026-04-16)**: [user-stories-snapshot.md](./user-stories-snapshot.md)

## What this prototype is

A Fire TV mobile-controller testbed. A phone pairs to a TV via a 6-digit room code and drives on-screen navigation and gameplay over WebSockets. The current repo implements the pairing + controller loop; PU&P extends it into a multi-player, multi-game session model.

## Glossary (canonical terms)

| Term | Meaning |
|------|---------|
| **Session** | A continuous TV engagement, lifespan ~30 min. Survives game switches. |
| **Party** | The set of phones connected to the TV in a session. Persists across games. |
| **Slot** | A game-specific seat. A phone must **Join** to claim a slot in a game. A game declares how many slots it has. |
| **Player** | A party member who has claimed a slot in the current game. |
| **Spectator** | A party member without a slot. Sees the game, no controls. |
| **Game lobby** | The pre-round screen where slots are visible, QR is always shown, and party members press Join. |
| **Round end** | The end-of-round screen (scores, Play Again). **Not** a game exit — party stays in game context. |
| **Game exit** | Leaving the game → return to hub. Party persists; no re-scan. |
| **System menu** | Universal TV overlay (QR, short URL, room code, exit). Triggered from any phone's top bar or hardware-remote back button. Pauses game; all phones forced to D-pad. |

## Epic summary (from the user stories doc)

| Epic | Coverage |
|------|----------|
| 1. First Session | Checkout → App Clip → auto-connect → first game without hardware remote. |
| 2. Returning User Connects | Hardware-remote entry + in-game QR → phone takes over. |
| 3. Party Formation | Name entry on phone + Join claims a slot. QR always visible in every game lobby. |
| 4. Lobby Capacity | Party can exceed slots → overflow becomes spectators. Release Slot pre-start. |
| 5. Game Start & Play | Any joined player can Start. Slots lock at start. Spectator-lock for overflow. |
| 6. Game Switching | Party persists across game switches. Names carry. No re-scan. |
| 7. Play Again | Game-declared: auto-continue, lobby reopen, etc. Spectators race for slots. |
| 8. Reconnection | Auto-reconnect on app return. TV-side widget (~10s) for party drops. Pause-and-menu if last player drops. ~30-min session. |
| 9. Mid-game Join/Leave | Mid-game scans → party-only (spectator), slot claim at next lobby. Leave mid-round = open slot (config). |
| 10. Non-mobile Input | Hardware remote + mobile coexist. Remote can navigate; in multiplayer it cannot claim slots or feed voice. |
| 11. System Menu | **US-24 is canonical.** Pauses game, all phones → D-pad, any player can trigger. |
| 12. Mobile Settings | Intentional Disconnect removes player from party entirely (different from leave-round). |

**Out of scope (per 2026-04-15 update)**: avatars, mid-session profile editing. Name entry only at game lobby.

## Milestones (from PRD)

- **M1** — Checkout→connect, D-pad hub, game entry (single player path).
- **M2** — Party persistence, party-aware game entry, slot architecture, spectator, leave behaviors.
- **M3** — System menu canonical, reconnection UI, slot-drop policy.
- **M4** — Hub system menu (**blocked on hub backend**).

M1.5 (profiles) was folded into M2.

## Current build status (as of 2026-04-16)

High-level gaps vs PU&P vision. See [plan.md](./plan.md) for detailed gap analysis and proposed work.

| Area | Status |
|------|--------|
| Pairing (QR + 6-digit code) | ✅ Built |
| Single-mobile ↔ TV socket loop | ✅ Built |
| Room persistence across TV refresh | ✅ Built (30s server grace + sessionStorage) |
| iOS shell (QR scan, haptics, settings) | ✅ Built |
| Song Quiz flow (hub → loading → mode menu → playlist) | ✅ Built (no actual gameplay yet) |
| Persistent TopBar (back/system/settings) | ✅ Built on mobile |
| **Party** (multi-phone, persistent across games) | ❌ Missing |
| **Slot** architecture (claim / release / cap / lock) | ❌ Missing |
| **Spectator** role | ❌ Missing |
| **Name entry** at game lobby | ❌ Missing |
| **System menu** canonical overlay (pause + force D-pad) | ⚠️ Partial (button exists, no overlay contract) |
| **Round end vs game exit** split | ❌ Missing |
| **Play Again** configurable flow | ❌ Missing |
| **Reconnection** (30-min session, auto-reconnect, TV widget) | ⚠️ Partial (basic socket reconnect only) |
| **Shared design tokens** | ❌ Missing (inline values throughout) |

## How to work in this codebase

See [/CLAUDE.md](../../CLAUDE.md) for architecture, dev setup, and iOS/HTTPS gotchas. Memory-level notes live in `~/.claude/projects/.../memory/MEMORY.md`.
