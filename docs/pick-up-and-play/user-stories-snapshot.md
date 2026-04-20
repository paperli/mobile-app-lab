# Pick Up and Play — User Stories

User stories covering the full PU&P experience — checkout through multiplayer, reconnection, system menu, and hub party formation. Each story is narrative: role + trigger + outcome + short behavior + a `Governs:` line pointing to the PRD feature that carries the testable acceptance criteria. The PRD is the source of truth for ACs, configs, and open questions.

[Figma](https://www.figma.com/design/N3oRN0ITDeCfB9sxcK9TkC/Pick-Up---Play?node-id=3181-128389) | [Notion](https://www.notion.so/Pick-Up-and-Play-User-Stories-321442bc97138118801cd5c7dafe4cfa?pvs=21) | PRD

> **Scope changes** (2026-04-15): Avatars and mid-session profile editing removed from scope. The edit profile screen on mobile phone is gone — name entry happens only at the game lobby ([US-07](https://www.notion.so/Pick-Up-and-Play-User-Stories-321442bc97138118801cd5c7dafe4cfa?pvs=21)). Avatars conflicted with per-game character selection in SQ and J!, had limited standalone value, and no cross-game sync. Both deferred until a proper profile system exists. See also: US-22 and US-28 removed (see below); US-21 covers non-mobile input coexistence; ACs live in the PRD only — this doc is narrative-only; M1.5 folded into M2.
> 

## Epic 1: First Session (New User)

Covers checkout through first game. PRD [Journey 1](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21), [Journey 3](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21).

**US-01 — New user checks out and connects without touching the TV remote**

As a new user who sees the checkout upsell on TV, when I scan the QR code on my phone I complete checkout, download the app/App Clip, and my phone auto-connects to the TV. I never need the hardware remote. If auto-connect fails, the connect QR stays visible on TV so I can pair without repeating checkout.

**Governs**: PRD → [M1 Checkout to connect](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21)

**US-02 — New user plays their first game**

As a new user who just connected, when I select a game from the hub using my D-pad the game launches and my phone switches to that game's controller. No extra pairing. Round end keeps me in the game — exit is a separate action (see [US-11b](https://www.notion.so/Pick-Up-and-Play-User-Stories-321442bc97138118801cd5c7dafe4cfa?pvs=21)).

**Governs**: PRD → [M1 D-pad hub navigation](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21), [M1 Game entry](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21)

## Epic 2: Returning User Connects

Covers returning user entry via hardware remote then QR. PRD [Journey 2](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21).

**US-03 — Returning user connects phone from inside a game**

As a returning subscriber navigating with the hardware remote, when I enter a game and scan the in-game QR my phone connects and I switch to the mobile controller for that game. After the game, the D-pad continues on the hub — no need to pick the hardware remote back up. If hub party formation exists (US-30), connecting from the hub is also an option.

**Governs**: PRD → [M1 Game entry](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21)

**US-04 — Returning user switches games after connecting**

As a returning user who connected inside a game, when I finish that game and pick another from the hub my phone stays connected. The new game's controller loads automatically. Works across any number of switches in the same session.

**Governs**: PRD → [M1 Game switching](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21), [M2 Party persistence](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21)

## Epic 3: Party Formation

Covers forming a party inside a game. PRD [Journey 3](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21).

**US-05 — Party members from hub land in game lobby without re-scanning**

As a player who joined the party from the hub, when the game's lobby loads my phone goes to the name screen and the TV shows the game's open slots. No QR re-scan. Pressing Join places my name in a slot. Works for groups arriving together.

**Governs**: PRD → [M2 Party-aware game entry](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21)

**US-06 — New player scans QR to join the party**

As a new player not yet in the session, when I scan the QR code on the game lobby TV my phone pairs to the TV and I join the party. My phone shows the name screen. The TV keeps showing open slots. Pressing Join places my name in a slot. QR is visible in every game lobby: single-player and multiplayer, even at zero connected players.

**Governs**: PRD → [M2 Party persistence](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21), [M2 Party-aware game entry](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21)

**US-07 — Player sets name and claims a game slot**

As a party member in the game lobby, when I set or confirm my name on my phone and press Join I claim a game slot and become an active game player. Name entry happens on my phone; the slot only fills on Join. Name is editable until I confirm; editing does not claim a slot. Join is only available when slots remain open.

**Governs**: PRD → [M2 Party persistence](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21), [M2 Party-aware game entry](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21)

## Epic 4: Game Lobby — Capacity & Slot Management

Covers slot cap, overflow, and slot release. PRD [Journey 6](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21), [Journey 10](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21).

**US-08 — Party exceeds game capacity**

As a party member trying to Join after all slots are taken, my phone shows the round is full and I remain in the party as a spectator. If a player releases their slot, my phone returns to the Join screen and I can claim it — first-come-first-served. Party size is independent of game slot count.

**Governs**: PRD → [M2 Slot architecture](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21), [M2 Spectator](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21)

**US-09 — Player releases their slot before game starts**

As a player who has claimed a slot, before the game has started I can tap "Release Slot" on my phone. My phone returns to the Join screen and the slot opens — any party member (including me) can claim it. First-come-first-served. Only available pre-game-start.

**Governs**: PRD → [M2 Slot architecture](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21)

## Epic 5: Game Start & Gameplay

Covers starting the game, controller transition, spectator lock, game end. PRD [Journey 3](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21).

**US-10 — Game starts from the lobby**

As a player who has claimed a slot, once minimum slots are filled I can select Start Game on TV with my D-pad. Any joined player can trigger it — no designated host. If open slots remain, all connected players see the same confirmation prompt; anyone can confirm or cancel. Once Start Game is confirmed, slots lock, playing phones transition to the game controller, party members without a slot become spectators.

**Governs**: PRD → [M2 Slot architecture](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21), [M2 Spectator](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21)

**US-11 — Round end is communicated to all party members**

As a party member (playing or not), when a round ends the game shows its end-round screen (scores, results, Play Again) and I stay in the game context with D-pad. I'm not automatically sent back to the hub. Round end ≠ game exit.

**Governs**: PRD → [M2 Leave behaviors](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21)

**US-11b — Game exit returns all party members to hub**

As a party member, when the game is exited (via system menu, back button, or game flow) I return to the hub with my D-pad. Party persists — no re-scan required to play another game. Any player can trigger exit; the game flow itself can also trigger it.

**Governs**: PRD → [M2 Leave behaviors](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21), [M3 System menu](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21)

## Epic 6: Game Switching with Party

Covers switching games with party intact. PRD [Journey 4](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21).

**US-12 — Party switches games without losing anyone**

As a party that has exited a game to the hub, when any player selects a new game all party members stay connected. Each phone goes into the new game's lobby flow. No re-scan. Players who explicitly left the session are not carried forward.

**Governs**: PRD → [M2 Party persistence](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21)

**US-13 — Name carries across games**

As a party member switching to a new game, the new game's lobby my name is prefilled on my phone from the previous game. I can edit before pressing Join. The TV lobby shows my name only after I press Join. No party re-entry across game switches in the same session. Name persists through the session; cross-session persistence is nice-to-have — if lost in a new session, I re-enter.

**Governs**: PRD → [M2 Party persistence](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21), [M2 Party-aware game entry](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21)

## Epic 7: Play Again

Covers end-of-round rotation. PRD [Journey 7](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21).

**US-14 — Play Again flow is configurable**

As a player at the end of a round, when Play Again is triggered the flow depends on the game's Play Again config and current party state. Platform provides the building blocks and party/slot data — the game declares its preferred behavior.

Default: "Auto-continue" — next round starts instantly with current players when party ≤ slots; when party > slots, lobby reopens and everyone races for slots (per [US-15](https://www.notion.so/Pick-Up-and-Play-User-Stories-321442bc97138118801cd5c7dafe4cfa?pvs=21)). No re-scan required.

**Governs**: PRD → [M2 Leave behaviors](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21), Game Configurations

**US-15 — Spectator races for a slot on Play Again**

As a party member who spectated the previous round, when Play Again returns to the lobby I can race for a game slot on equal footing with prior-round players.

Default: "Pickup and play" — any party member can claim, first-come-first-served.

**Governs**: PRD → [M2 Spectator](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21), [M2 Leave behaviors](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21), Game Configurations

## Epic 8: Reconnection

Covers disconnect and recovery. PRD [Journey 5](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21).

**US-16 — Player reconnects automatically after phone interruption**

As a player whose phone is interrupted by a call or app switch, when I return to the app my phone auto-reconnects and my controller is restored. TV-side escalation ([US-17a](https://www.notion.so/Pick-Up-and-Play-User-Stories-321442bc97138118801cd5c7dafe4cfa?pvs=21)) runs in parallel — auto-reconnect can resolve at any point. If my slot was still held, I resume in-game; if released, I return as a spectator. If auto-reconnect fails or the session has expired (~30 min per [US-17b](https://www.notion.so/Pick-Up-and-Play-User-Stories-321442bc97138118801cd5c7dafe4cfa?pvs=21)), the phone shows manual reconnect options.

**Governs**: PRD → [M3 Reconnection UI](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21)

**US-17a — Player disconnects while party game continues**

As a player whose phone disconnects during a party game (others still connected), the TV shows a small reconnection widget (room code + URL, ~10s).

Default: The game continues, the slot is marked disconnected, no pause.

Exception: games may declare pause-on-drop per platform/game/scene (solo with one slot, mandatory-turn scene, all-slots-required scene). On timeout, slot releases and a takeover inherits the prior slot's game state and display (score, name) until the next lobby. Reconnection paths: auto-reconnect on app return, scan QR from system menu, or enter the room code.

**Governs**: PRD → [M3 Slot-drop policy](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21), [M3 Reconnection UI](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21)

**US-17b — Last/only player disconnects and game auto-pauses**

As the only connected player (or last remaining), when my phone disconnects the game pauses and the system menu auto-opens on TV with QR, short URL, and room code. Reconnect paths: scan QR directly from TV, open app → "Connect to TV" (phone looks up last session and auto-reconnects), or hardware remote back button → system menu.

Default: session stays alive ~30 min. The always-visible short URL + room code on TV is the sole fallback when all phones are out.

**Governs**: PRD → [M3 Reconnection UI](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21), [M3 System menu](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21)

## Epic 9: Mid-Game Join & Leave

Covers joining a live session and leaving during gameplay. PRD [Journey 9](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21).

**US-18 — New player joins a game already in progress**

As a new player wanting to join while a game is running, the natural join point is the game lobby between rounds (QR always visible there per [US-06](https://www.notion.so/Pick-Up-and-Play-User-Stories-321442bc97138118801cd5c7dafe4cfa?pvs=21)). Mid-game, an existing player can open the system menu to show the QR/room code — but mid-game join is not a prioritized path. Scanning mid-game adds me to the party as a spectator; I don’t take a game slot.

Default: party-only mid-game, slot claim at next lobby. Slot-drop policy (PRD M3) governs any takeover if a slot opens mid-game.

**Governs**: PRD → [M2 Spectator](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21), [M3 Slot-drop policy](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21)

**US-19 — Player leaves mid-game while party continues (configurable)**

As a player in an active round, when I choose to leave I become a spectator and my slot is handled per the game's configured behavior.

Default: "Open slot" if 2+ players remain, "Pause" if only 1 left. Intentional leave frees the slot immediately (no 10s widget). Takeover follows the PRD Slot-drop policy — inherit score + display name until next lobby.

**Governs**: PRD → [M2 Leave behaviors](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21), [M3 Slot-drop policy](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21)

**US-20 — Party exits the game and returns to hub**

As a party member, when any player selects "Exit Game" from the system menu (per [US-24](https://www.notion.so/Pick-Up-and-Play-User-Stories-321442bc97138118801cd5c7dafe4cfa?pvs=21)) the game exits and the party returns to hub.

Default: any player can select "Exit Game."

**Governs**: PRD → [M3 System menu](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21), [M2 Leave behaviors](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21)

## Epic 10: Non-mobile input

Covers hardware remote behavior when mobile controllers are present, plus single-player coexistence. PRD [Journey 8](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21).

**US-21 — Non-mobile input coexistence (hardware remote + mobile)**

As a Fire TV user, both my hardware remote and mobile controller work. In **single player**, both are interchangeable for navigation and gameplay; both mic paths (hardware remote mic and mobile mic) work. In **party/multiplayer**, the hardware remote works for TV navigation only — it cannot claim a game slot and has no voice input path to the game (no slot = no mic path). If I click the hardware remote back button the system menu opens (per [US-24](https://www.notion.so/Pick-Up-and-Play-User-Stories-321442bc97138118801cd5c7dafe4cfa?pvs=21)).

Cross-title consistency: if any game would like to restrict hardware remote voice input in a given context there should be an evaluation from a global UX perspective.

**Governs**: PRD → [M1 Fire TV](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21)

## Epic 11: System Menu

Canonical definition of system menu behavior. [US-24](https://www.notion.so/Pick-Up-and-Play-User-Stories-321442bc97138118801cd5c7dafe4cfa?pvs=21) is the definitive reference — all other stories that involve the system menu reference back here. [Figma](https://www.figma.com/design/N3oRN0ITDeCfB9sxcK9TkC/Pick-Up---Play?node-id=3131-65138&m=dev).

**US-24 — Player opens system menu during gameplay**

As a player in an active game, when I press the system menu button on my phone (or back button on phone/hardware remote) the system menu overlay appears on TV.

Default: game pauses, all connected phones switch to D-pad so anyone can navigate the system menu. Any connected player can trigger — active players and spectators, no admin/host restriction. Dismissing clears the overlay, phones return to the game controller, and the game resumes.

**Governs**: PRD → [M3 System menu](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21)

**US-25 — Player opens system menu on hub**

As a player on the hub, when I press the system menu button on my phone the system menu overlay appears on the hub TV — same content and triggers as in-game. **Blocked on hub backend.** No workaround planned; unblocked when hub backend is scoped.

**Governs**: PRD → M4 Hub system menu (blocked)

**US-26 — Player triggers system menu for join or reconnect**

As a connected player, when a friend wants to join or a party member needs to reconnect I open the system menu (per [US-24](https://www.notion.so/Pick-Up-and-Play-User-Stories-321442bc97138118801cd5c7dafe4cfa?pvs=21)) where QR, short URL, and room code are available. They scan or enter the code to connect. Works during gameplay and on hub.

**Governs**: PRD → [M3 System menu](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21), [M3 Reconnection UI](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21)

## Epic 12: Mobile Settings

Covers settings-accessible flows during a session. [Figma](https://www.figma.com/design/N3oRN0ITDeCfB9sxcK9TkC/Pick-Up---Play?node-id=3131-64552&m=dev).

**US-27 — Player intentionally disconnects from session**

As a player who wants to leave the session entirely, when I tap Disconnect in mobile settings and confirm, I'm removed from the party and my phone returns to the pre-connected state.

Player is removed from the game slot and the party entirely. Slot is freed immediately (no 10s hold — intentional disconnect is explicit). Game does not pause. Different from [US-19](https://www.notion.so/Pick-Up-and-Play-User-Stories-321442bc97138118801cd5c7dafe4cfa?pvs=21) (leave round → spectator, stay in party) — this is leave the session.

**Governs**: PRD → [M2 Leave behaviors](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21), [M3 System menu](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21)

---

## Resolved Comments

Previous comment threads from the original Notion doc — now resolved and reflected in the stories above. @Kevin raised both.

### Platform-level enforcement of slot cap (on US-08)

> Does this need to be enforced at the Platform level? This will be a significant question in terms of whether games are responsible for rendering this screen as a game phase, or if its a platform functionality (which we haven't designed much for at this point).
> 

**Resolved**: Slot cap enforcement is game-owned (or overlay service if built). Not platform-enforced. Platform is agnostic to player connections. The broader question of games vs overlay service for shared UI is still open (PRD OQ #1) — but enforcement lives in games or a shared surface backend, not in platform-api/platform-wss.

### Post-game state (on US-11)

> Post-game for now means back to hub/dpad for TVs/controllers right? Or are we still exploring what the post-game state looks like for multiplayer? Platform team's base expectation is that game webviews will be closed on all devices.
> 

**Resolved**: Round end ≠ game exit. Round end is fully game-owned — game shows end-round screen (scores, results, Play Again), D-pad active, players stay in game context. Platform only acts on game exit (returns players to hub, closes webviews). Platform closing webviews only applies to game exit, never round end.

---

## Continuity gaps

Flagged only. Not resolved here. Each gap lands in a future pass.

### PRD features that may lack direct US coverage

- [**M3 Slot-drop policy](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21) (new subsection)** — referenced from [US-17a](https://www.notion.so/Pick-Up-and-Play-User-Stories-321442bc97138118801cd5c7dafe4cfa?pvs=21), [US-18](https://www.notion.so/Pick-Up-and-Play-User-Stories-321442bc97138118801cd5c7dafe4cfa?pvs=21), [US-19](https://www.notion.so/Pick-Up-and-Play-User-Stories-321442bc97138118801cd5c7dafe4cfa?pvs=21), but has no US of its own describing the policy from the game's point of view. Consider whether this is a game-facing config story (configurable per platform/game/scene declaration) rather than a player-facing user story.
- [**M2 Party persistence](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21) — name capture on first join** — folded in from the deleted M1.5 Profiles. Covered by [US-07](https://www.notion.so/Pick-Up-and-Play-User-Stories-321442bc97138118801cd5c7dafe4cfa?pvs=21) (lobby name set) + [US-13](https://www.notion.so/Pick-Up-and-Play-User-Stories-321442bc97138118801cd5c7dafe4cfa?pvs=21) (name carries), but the "first-ever name entry + device-local storage" path is implicit rather than called out. US-28 (edit mid-session) removed from scope. If a dedicated US is useful, it lives in Epic 3.
- **M4 Hub system menu** — partially covered by [US-25](https://www.notion.so/Pick-Up-and-Play-User-Stories-321442bc97138118801cd5c7dafe4cfa?pvs=21) (blocked). No coverage for the hub-specific system menu surfaces (party roster on hub, exit Weekend app entry). Revisit once hub backend is scoped.

### User stories with ambiguous PRD feature target

- [**US-11](https://www.notion.so/Pick-Up-and-Play-User-Stories-321442bc97138118801cd5c7dafe4cfa?pvs=21) (Round end signal)** and [**US-11b](https://www.notion.so/Pick-Up-and-Play-User-Stories-321442bc97138118801cd5c7dafe4cfa?pvs=21) (Game exit signal)** — game-owned end-round behavior. The platform's role is the round-ended / game-exited signal. Consider whether these need a dedicated Platform Deliverables line rather than a full feature.
- [**US-27](https://www.notion.so/Pick-Up-and-Play-User-Stories-321442bc97138118801cd5c7dafe4cfa?pvs=21) (Intentional disconnect)** — straddles [M2 Leave behaviors](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21) and [M3 System menu](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21). Governs line points at both; if that's too loose, the PRD should pick a primary owner.
- [**US-21](https://www.notion.so/Pick-Up-and-Play-User-Stories-321442bc97138118801cd5c7dafe4cfa?pvs=21) (Non-mobile input coexistence)** — mapped to [M1 Fire TV](https://www.notion.so/WIP-Pick-Up-and-Play-PRD-341442bc9713814b8b74c8190f2daba6?pvs=21). The feature number in the existing PRD may need a dedicated subsection for "single-player coexistence" vs "party-mode constraints" if the one section is getting crowded.

### Downstream cross-ref cleanup (tracked from US-22 merge)

- Game Config table row "Controller source (Fire TV) / US-23" — repoint to [US-21](https://www.notion.so/Pick-Up-and-Play-User-Stories-321442bc97138118801cd5c7dafe4cfa?pvs=21)
- Fire TV Feature header links (PRD L657 area) — repoint to [US-21](https://www.notion.so/Pick-Up-and-Play-User-Stories-321442bc97138118801cd5c7dafe4cfa?pvs=21)
- Out of Scope (PRD area): "Hardware remote mic input during party gameplay (US-22)" — repoint to [US-21](https://www.notion.so/Pick-Up-and-Play-User-Stories-321442bc97138118801cd5c7dafe4cfa?pvs=21)
- Resolved Q #3 (→ Feature 12, US-23) — update reference
- Resolved Q #13 (→ Feature 12, US-22) — update to [US-21](https://www.notion.so/Pick-Up-and-Play-User-Stories-321442bc97138118801cd5c7dafe4cfa?pvs=21)