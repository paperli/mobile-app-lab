# Pick Up and Play — Implementation Plan

Detailed plan for rebuilding the prototype around the PU&P vision. Read [README.md](./README.md) first for the glossary and epic summary.

## 1. Domain model

The current code has one abstraction: **Room** (`packages/server/src/room-manager.ts`) = `{ code, tvSocketId, mobileSocketIds[], createdAt }`. PU&P needs a richer model. Proposed shape, to live in `packages/shared/src/types.ts`:

```ts
Session {              // ~30 min lifespan, one per TV
  id, code, shortUrl,
  createdAt, expiresAt,
  tvSocketId | null,   // TV can drop/reconnect via grace
  partyMembers: Map<memberId, PartyMember>,
  activeGame: GameId | null,
  gameState: 'hub' | 'lobby' | 'in-game' | 'round-end' | 'system-menu',
}

PartyMember {          // survives game switches
  id,                  // stable per phone in session
  socketId | null,     // null while disconnected
  name: string | null, // set at first lobby, carried after
  lastSeenAt,
}

Slot {                 // game-scoped, one list per active game
  index,               // 0..N-1
  memberId | null,     // null = open
  claimedAt,
  state: 'open' | 'claimed' | 'locked' | 'disconnected',
}

GameConfig {           // declared by each game, lives with game module
  minSlots, maxSlots,
  playAgainMode: 'auto-continue' | 'lobby-reopen' | ...,
  pauseOnDrop: boolean | scene-level rules,
  slotDropPolicy: 'open' | 'hold-10s' | 'pause',
}
```

**Key invariant**: party membership is a property of the **session**. Slot ownership is a property of the **active game**. Switching games keeps party, clears slots.

## 2. Socket event contract (proposed additions)

Current events (`packages/shared/src/constants.ts`) are TV/mobile bidirectional screen + navigation forwarding. Add:

| Event | From → To | Payload |
|-------|-----------|---------|
| `PARTY_JOIN` | server → all | `{ memberId, name? }` |
| `PARTY_LEAVE` | server → all | `{ memberId, reason }` |
| `NAME_SET` | mobile → server | `{ name }` |
| `SLOT_CLAIM` | mobile → server | `{ slotIndex? }` (server may auto-assign) |
| `SLOT_RELEASE` | mobile → server | `{}` (pre-start only) |
| `SLOT_UPDATE` | server → all | `{ slots: Slot[] }` |
| `GAME_START` | any phone → server | `{}` (server confirms with all) |
| `GAME_EXIT` | any phone → server | `{}` |
| `ROUND_END` | game (TV) → server | `{ scores? }` |
| `SYSTEM_MENU_OPEN` | any phone → server | `{}` |
| `SYSTEM_MENU_CLOSE` | any phone → server | `{}` |
| `PLAYER_ROLE_UPDATE` | server → mobile | `{ role: 'player' \| 'spectator', slotIndex? }` |
| `SESSION_RESUME` | mobile → server | `{ sessionId, memberId }` |

Server becomes stateful for party/slots; games own round-end/start semantics and emit `ROUND_END` / `GAME_EXIT` signals.

## 3. Screen state machines

### Mobile phone

```
pre-connected → pairing (QR/code entry)
  ↓ on join
party-connected
  ├─ hub mirror (D-pad controller, no lobby)
  ├─ game-lobby (name entry + Join)
  ├─ playing (game-specific controller)
  ├─ spectator (passive screen, no controls)
  └─ system-menu-active (forced D-pad)
```

### TV

```
hub
  ↓ game pick
game-lobby          (slots + QR + Start Game button)
  ↓ slots lock
in-game             (game-owned UI)
  ↓ round finishes
round-end           (game-owned; Play Again per config)
  ↓ exit
hub

(orthogonal) system-menu-overlay: can appear over any TV state except hub (hub blocked per M4)
```

## 4. Milestone-by-milestone plan

### M1 — Checkout to connect / D-pad hub / game entry

Mostly in place. Remaining for PU&P fit:

- **US-01 App Clip path**: add deep-link handler `mobileapplab://pair?code=XXXXXX` — already defined in `ios/` config; verify server correctly carries the deep-linked code into auto-join.
- **US-02 game entry controller swap**: already wired via `tvScreen` → controller selection in `packages/mobile/src/App.tsx`. Keep.
- **US-03 in-game QR**: QR is currently hub-only. Move QR widget into a reusable component that also lives on game lobby and system menu.

### M2 — Party / slots / spectator / leave (the big one)

This is the bulk of the work and a rewrite of the server+shared packages.

**Server (`packages/server/`)**:
1. Extract current room-manager into `session-manager.ts` with the data model from §1.
2. Add `party-manager.ts`: handles join/leave/disconnect with persistent `memberId` (stable token returned to phone; phone stores in `localStorage`; phone presents on reconnect via `SESSION_RESUME`).
3. Add `slot-manager.ts`: game-scoped; configurable min/max per game; claim/release/lock/open transitions; enforces first-come-first-served; emits `SLOT_UPDATE`.
4. Add `name-manager.ts`: stores name per memberId per session; carries on game switch.
5. Grace: extend TV grace window pattern to mobile members (~30 min). Disconnected members retain their memberId and (optionally) their slot per game config.

**Shared (`packages/shared/`)**:
1. New types per §1.
2. New events per §2.
3. `GameConfig` type + a registry so games declare `{ minSlots, maxSlots, playAgainMode, slotDropPolicy }`.

**TV (`packages/tv/`)**:
1. New `GameLobby` screen: slot grid + QR card + Start Game button. Always renders QR, even at zero connected players (US-06).
2. Slot visualization component (`SlotCard`): states `open / joining / claimed (name) / locked / disconnected`.
3. Update `App.tsx` `AppScreen` to include `'game-lobby' | 'in-game' | 'round-end'`.
4. Route `GAME_START` / `GAME_EXIT` / `ROUND_END` signals.

**Mobile (`packages/mobile/`)**:
1. New `LobbyScreen`: name entry + Join button. Name field editable until Join; editing doesn't claim a slot (US-07).
2. New `SpectatorScreen`: passive message ("Round in progress. You'll race for a slot at Play Again.").
3. Role-aware root: when `role === 'spectator'`, swap controller for spectator screen.
4. Persist `memberId` + `sessionId` in `localStorage` for reconnect.

**iOS (`ios/`)**:
- No new native work for M2 proper. WebView consumes the new flows. But: verify that rapid WebView state transitions on lobby/role changes don't race the existing `loadURLIfNeeded` guard.

### M3 — System menu / reconnection / slot-drop policy

**System menu (canonical: US-24)**:
- New TV component `SystemMenuOverlay`: fullscreen overlay with QR, short URL, room code, Exit Game, close.
- On `SYSTEM_MENU_OPEN`: server pauses game (emits `GAME_PAUSE`), forces all phones to D-pad via `PLAYER_ROLE_UPDATE`. Any phone can trigger (no host).
- On `SYSTEM_MENU_CLOSE`: resume; phones return to their game controller.
- Hook up to existing mobile TopBar `system` button (already in `packages/mobile/src/components/TopBar.tsx`).
- Hardware remote back button opens the same overlay.

**Reconnection**:
- TV-side `ReconnectWidget`: small bottom-corner widget shown when a party member drops (others still connected). Visible ~10s. Contains room code + short URL (US-17a).
- Full-screen system menu with pause when **last/only** player drops (US-17b).
- Mobile auto-reconnect: on app return, if `sessionId` + `memberId` still valid and within ~30 min, emit `SESSION_RESUME`. If slot still held → resume in-game; if released → return as spectator. Fail → show manual reconnect.

**Slot-drop policy (games declare)**:
- Per game / scene: `pauseOnDrop: boolean`, `slotDropPolicy: 'open-immediately' | 'hold-10s' | 'pause'`.
- Takeover inherits prior slot's score + display name until next lobby.

### M4 — Hub system menu

Blocked on hub backend. Out of scope until the hub is a backend-driven surface. Keep the mobile system-menu button functional on hub (it already opens local settings); defer the overlay parity to M4.

## 5. Design system considerations

The audit found **no centralized tokens** — colors and spacing are inlined across TV and mobile. For a system this size with cross-device consistency requirements (TV 1920×1080 + mobile + iOS webview), we should establish a foundation in M2 to avoid rework.

### Proposed token set (in `packages/shared/src/tokens.ts` or a new `packages/ui/`)

- **Color**: `brand.primary` (#FFE88B yellow focus), `brand.bg` (#00001f mobile bg), `state.claimed`, `state.open`, `state.disconnected`, semantic `text.primary/secondary/muted`, `overlay.system-menu`.
- **Spacing**: base 4pt scale; TV uses vw/vh-responsive derivations, mobile uses absolute px.
- **Typography**: two size scales — `tv.*` (designed for 1080p viewing distance) and `mobile.*`. Same font family.
- **Motion**: canonical durations (bounce: 120ms, fade: 200ms, ellipse-reveal: 600ms) in `motion.ts`. Existing game modal / wave-guide transitions already use constants — consolidate.
- **Focus**: canonical focus frame styling (`#FFE88B` yellow, 0.5vw margin) — both hub and game menus use similar patterns; promote to shared `FocusFrame` variants.

### Canonical components to extract or build

| Component | Lives in | Purpose | Status |
|-----------|----------|---------|--------|
| `QRCard` | tv + mobile(?) | Scannable pairing QR + short URL + room code | Partial (hub only) |
| `RoomCodeDisplay` | tv | 6-digit code, large, always-visible fallback | Partial |
| `FocusFrame` | tv | Shared focus border w/ bounce/press animation | Two copies exist |
| `SlotCard` | tv | Open / claimed / locked / disconnected | Not built |
| `PartyRoster` | tv | Compact list of connected phones + roles | Not built |
| `SystemMenuOverlay` | tv | Full-screen canonical menu | Not built |
| `ReconnectWidget` | tv | Small bottom-corner widget (~10s) | Not built |
| `LobbyHeader` | tv | "Who's playing" band + Start Game CTA | Not built |
| `NameEntryField` | mobile | Name input + Join button | Not built |
| `SpectatorView` | mobile | Passive state for overflow/dropped | Not built |
| `TopBar` | mobile | Back + system + settings (**built**) | ✅ |
| `SettingsPanel` | mobile | Disconnect / support (**built**) | ✅ |

### Rive artboard catalog (current + proposed)

Already built: `edge_glowing`, `game_logo_box` (both in `uikit.riv`). The wave guide transition is CSS+JS (not Rive).

Proposed additions: `slot_card` (state machine for open→claimed→locked), `system_menu_backdrop` (animated overlay entry), `reconnect_widget`.

### TV ↔ mobile visual language

Keep them **intentionally distinct** (TV: focus-driven, spatial; mobile: button-driven, tactile) but unified through tokens. Avoid copy-pasting components across — share only tokens + primitives (QR, icons, sounds).

## 6. Suggested execution order

1. **Foundation** (1–2 sessions): tokens + shared types/events for Party/Slot/GameConfig. No UI yet; just compile clean.
2. **Server rewrite** (1–2 sessions): session-manager + party-manager + slot-manager. Update socket handlers. Keep old room path alive behind a feature flag for safety, or migrate cleanly.
3. **Game Lobby MVP** (1 session): TV `GameLobby` + mobile `LobbyScreen` + `NameEntryField`. Single-game path (Song Quiz). Slot claim/release works. QR always visible.
4. **Start / Round-end split** (1 session): `GAME_START` / `ROUND_END` / `GAME_EXIT` plumbing. Spectator role + screen.
5. **System menu overlay** (1 session): `SystemMenuOverlay` + TopBar wiring + pause/resume + forced D-pad.
6. **Reconnection** (1–2 sessions): `memberId` persistence, `SESSION_RESUME`, TV `ReconnectWidget`, 30-min session lifespan.
7. **Play Again** (1 session): config per game, auto-continue vs lobby-reopen, spectator-races path.
8. **Mid-game join/leave polish** (1 session): spectator join mid-game, leave-mid-round open-slot behavior.

## 7. Out of scope (explicit)

- Avatars / profile editing (removed 2026-04-15).
- Hub system menu UI (M4, blocked).
- Checkout flow UI (App Clip exists; actual checkout is the real app, not this prototype).
- Tests — repo has zero test files. Continue to run `npm run typecheck` via pre-commit hook; add tests if/when PU&P ships outside of prototyping.

## 8. Open questions to resolve before M2

1. Is `memberId` server-issued (opaque token) or derived from something stable per phone? (Privacy note: phones change IPs; socket IDs churn. A server-issued UUID stored in mobile `localStorage` is the simplest.)
2. How do games register their `GameConfig`? Static export from each game module, or a server-side config file? (Static export keeps games self-describing.)
3. Does the prototype need real checkout/App Clip UI or just the deep-link path? (Probably the latter — this is a prototype.)
4. Does Song Quiz ship as a multi-player path first, or does the next prototype game?
5. Where does the Play Again state machine live — platform or game? (PRD Journey 7 suggests platform provides building blocks; game declares config.)
