# Weekend Design System — v1 Design Spec

**Date:** 2026-04-20
**Branch:** `feature/pick-up-and-play`
**Status:** Design approved, awaiting user review before implementation plan
**Scope:** A shared design system (`@weekend/ui`) that covers foundations + the TV system-menu flow end-to-end, plus the mobile trigger needed to test it.

---

## 1. Goals and non-goals

### Goals

- Establish a token system (colors, typography, spacing, radii, shadows, motion) that both TV and mobile apps consume.
- Provide Radix-based primitives (`Button`, `Dialog`) styled with Weekend brand chrome.
- Make the TV **System Menu** flow — Resume / Controllers / Exit Game — fully working end-to-end, including the **Controllers** L2 panel (QR + room code + connection slots).
- Extract the **mobile System button** as the trigger into `@weekend/ui`, so the phone-to-TV open/close loop is testable in v1.
- Dark-first visuals with a light-theme hook built into the token layer.
- Per-game tinting of the backlit modal via CSS custom properties.

### Non-goals (deferred to later specs)

- Full `TopBar` (Back + Menu) and `SettingsPanel` port — Tier 3, follow-up spec.
- `PartyRoster`, `NameEntryField`, `SpectatorView`, `ReconnectWidget`, `LobbyHeader`, `Play-Again` flow — depend on PU&P M3/M4 domain work.
- Storybook, visual-regression testing, unit tests for components. Project has zero tests today; not the time to introduce a test framework.
- Rive edge-glow, `RiveGameLogo`, `VoiceGlow`, D-pad layouts — kept as pattern docs in the repo, not first-class components in v1.
- Haptics integration on `SystemButton` — deferred with Tier 3 `TopBar`.

---

## 2. Architectural decisions

All decisions below were locked during clarifying-round A/B/C questions.

| Decision | Choice | Rationale |
|---|---|---|
| Radix flavor | **Primitives** (`@radix-ui/react-*`) | Weekend brand is strong enough that Themes would mostly be a wrapper we'd style over. Primitives give accessibility + focus management without locking us into opinions we'd override. |
| Package layout | **Single package** `packages/ui-weekend/` with `tokens/` + `primitives/` + `tv/` + `mobile/` subpaths | Enforces plan.md's "share only tokens + primitives" rule via directory structure. Avoids multi-package build tax. |
| Token delivery | **CSS custom properties + Tailwind preset that references them** | Runtime theme swap + per-game modal tinting both require CSS vars. Tailwind preset gives ergonomic utilities (`bg-brand`, alpha modifiers). |
| v1 scope | **Tier 1 foundations + Tier 2 TV system menu + mobile System-button slice** | Tier 2 validates the token system against the hardest brand surface (backlit modal, focus nav). Tier 3 mobile work deferred to its own spec. |
| Preview surface | **Dev routes in existing apps** (TV + mobile), guarded by `import.meta.env.DEV` | Prototype-appropriate. Components tested in real runtime (10-ft focus nav on TV; touch on phone). |
| Migration strategy | **Port-first** | Existing components work; v1's real gain is the token system underneath, not rewriting working pixels. |

---

## 3. Package shape

```
packages/ui-weekend/
├── package.json              # name: @weekend/ui (workspace package)
├── tsconfig.json             # extends root
├── tailwind.preset.js        # Tailwind preset consumers extend
├── src/
│   ├── index.ts              # flat re-exports
│   ├── tokens/
│   │   ├── tokens.css        # :root vars + [data-theme="light"] overrides
│   │   ├── fonts.css         # @font-face (Weekend Repro; local, not S3)
│   │   └── index.ts          # TS constants for tokens that TS consumers need
│   ├── primitives/
│   │   ├── Button.tsx
│   │   ├── Dialog.tsx
│   │   └── index.ts
│   ├── tv/
│   │   ├── FocusFrame.tsx
│   │   ├── SystemMenuOverlay.tsx
│   │   ├── ControllersPanel.tsx
│   │   ├── QRCard.tsx
│   │   ├── RoomCodeDisplay.tsx
│   │   ├── SlotCard.tsx
│   │   └── index.ts
│   └── mobile/
│       ├── SystemButton.tsx
│       └── index.ts
└── README.md
```

**Consumer wiring** (applies to both `packages/tv` and `packages/mobile`):

1. Add `"@weekend/ui": "*"` to the app's `package.json`.
2. `import '@weekend/ui/tokens/tokens.css'` and `import '@weekend/ui/tokens/fonts.css'` once in the app entry.
3. Extend Tailwind config: `presets: [require('@weekend/ui/tailwind.preset')]`.
4. Import components directly: `import { Button, Dialog, FocusFrame } from '@weekend/ui'`.

**Why flat re-exports:** consumers never need to dig into subpaths. Tree-shaking handles unused exports.

**Why Tailwind preset over published CSS:** keeps consumer Tailwind setups authoritative; ui-weekend only extends the theme.

**Fonts migrated from S3 to local:** current TV `index.css` loads Weekend Repro from `volley-assets-public.s3.us-east-1.amazonaws.com`. Moves to `packages/shared/public/fonts/Weekend+Repro/*.woff2` (files already on disk) and is served from the ui-weekend package's `fonts.css`. Removes an external dep and keeps the offline-friendly iOS shell happy.

---

## 4. Token system

Two-layer architecture: **primitive palette tokens** at the base, **semantic tokens** on top.

- Primitive tokens (`--palette-*`) hold raw values.
- Semantic tokens (`--color-*`, `--radius-*`, etc.) reference primitives.
- Components only use semantic tokens.
- Light-theme override flips semantic tokens only — primitive palette stays.

### `tokens/tokens.css`

```css
:root {
  /* Layer 1 — primitive palette (rgb channels for Tailwind <alpha-value>) */
  --palette-yellow-300: 255 232 139;   /* #FFE88B */
  --palette-yellow-500: 246 211 0;     /* #F6D300 */
  --palette-cyan-400:   49 204 242;    /* #31CCF2 */
  --palette-indigo-500: 94 131 253;    /* #5E83FD */
  --palette-ink-950:    0 0 31;        /* #00001f — mobile bg */
  --palette-ink-900:    10 14 40;      /* TV bg */
  --palette-white:      255 255 255;
  --palette-grey-500:   128 128 140;
  --palette-grey-700:   64 64 80;
  --palette-red-500:    239 68 68;     /* error state */
  /* Palette expands as components introduce new needs. */

  /* Layer 2 — semantic tokens */
  --color-bg:           var(--palette-ink-950);
  --color-bg-elevated:  var(--palette-ink-900);
  --color-fg:           255 255 255;
  --color-fg-muted:     255 255 255 / 0.6;
  --color-brand:        var(--palette-yellow-300);
  --color-action:       var(--palette-yellow-300);
  --color-focus:        var(--palette-yellow-300);
  --color-modal-stroke: var(--palette-cyan-400);
  --color-modal-wash:   var(--palette-cyan-400);
  --color-modal-wash-2: var(--palette-indigo-500);

  /* Per-game tint — scoped overrides replace these on a game wrapper */
  --modal-tint:   var(--color-modal-stroke);
  --modal-wash:   var(--color-modal-wash);
  --modal-wash-2: var(--color-modal-wash-2);

  /* Type, spacing, radii, motion */
  --font-sans:       'Weekend Repro', ui-sans-serif, system-ui, sans-serif;
  --type-code:       96px;  /* RoomCodeDisplay — large TV-legible digits */
  --radius-pill:     9999px;
  --radius-card:     16px;
  --duration-fast:   150ms;
  --duration-base:   220ms;
  --ease-standard:   cubic-bezier(0.4, 0, 0.2, 1);
  --shadow-cta-glow: 0 4px 20px 0 rgba(255, 228, 1, 0.35);
}

[data-theme='light'] {
  --color-bg:          255 255 255;
  --color-bg-elevated: 245 245 247;
  --color-fg:          0 0 31;
  --color-fg-muted:    0 0 31 / 0.6;
}
```

### `tailwind.preset.js`

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        bg:            'rgb(var(--color-bg) / <alpha-value>)',
        'bg-elevated': 'rgb(var(--color-bg-elevated) / <alpha-value>)',
        fg:            'rgb(var(--color-fg) / <alpha-value>)',
        'fg-muted':    'rgb(var(--color-fg-muted) / <alpha-value>)',
        brand:         'rgb(var(--color-brand) / <alpha-value>)',
        action:        'rgb(var(--color-action) / <alpha-value>)',
        focus:         'rgb(var(--color-focus) / <alpha-value>)',
      },
      fontFamily: { sans: 'var(--font-sans)' },
      borderRadius: { pill: 'var(--radius-pill)', card: 'var(--radius-card)' },
      boxShadow: { 'cta-glow': 'var(--shadow-cta-glow)' },
      transitionDuration: { fast: '150ms', base: '220ms' },
    },
  },
};
```

### Per-game modal tinting

Scoped CSS-variable override, no prop drilling:

```tsx
<div style={{ '--modal-tint': '255 0 128' }}> {/* Song Quiz pink */}
  <Dialog>…</Dialog>
</div>
```

Any `Dialog` with `variant="backlit"` inside the scope picks up the override.

### Motion tokens

Kept minimal for v1 (`--duration-fast`, `--duration-base`, `--ease-standard`). Add more curves as components demand them; no point pre-specifying.

---

## 5. Primitives

### `Button`

Plain component over `<button>` with Radix Slot (`asChild` support). Uses `class-variance-authority` for variants (small dep, standard pattern).

**Variants:**

| Name | Use | Visual |
|---|---|---|
| `primary` (default) | Main CTAs | Yellow pill gradient `linear-gradient(180deg, #FFE88B 0%, #F6D300 94.88%)`, `shadow-cta-glow`, dark ink text |
| `outline` | Secondary actions | Transparent bg, 1px `border-fg/20`, pill radius |
| `ghost` | Tertiary / icon buttons | No bg/border, fg text |

**Sizes:** `sm` 36px, `md` 44px (default), `lg` 56px. Touch targets sized for mobile even in TV usage, so component transfers cleanly.

**Focus state:** `focus-visible:ring-2 ring-focus ring-offset-2 ring-offset-bg` — matches TV focus frame color so keyboard-focused buttons feel unified across surfaces.

**`asChild` pattern:** `<Button asChild><Link to="/games">Play</Link></Button>` — decouples from routing libs.

**Gradient as arbitrary class:** the primary gradient is inlined as `bg-[linear-gradient(180deg,#FFE88B_0%,#F6D300_94.88%)]`. Gradients don't semantically layer over `var()` cleanly; primitive tokens stay source of truth, update the string if palette changes.

### `Dialog`

Wraps `@radix-ui/react-dialog` with Weekend chrome. Re-exports Radix sub-components (`Root`, `Trigger`, `Portal`, `Title`, `Description`, `Close`) as-is; only `Content` and `Overlay` are styled.

**Variants:**

| Name | Visual |
|---|---|
| `plain` | Flat panel, `bg-bg-elevated`, `rounded-card`, standard drop shadow |
| `backlit` | Two blurred layers behind panel: (1) 4px cyan ring, `blur(6px)`, `opacity 0.75`, color `rgb(var(--modal-tint))`; (2) radial gradient `rgb(var(--modal-wash)) → rgb(var(--modal-wash-2))`, `blur(64px)`, `opacity 0.5` |

Both blur layers read CSS variables (`--modal-tint`, `--modal-wash`, `--modal-wash-2`), so per-game tinting works by setting those vars on any ancestor.

**API:**

```tsx
<Dialog.Root open={open} onOpenChange={setOpen}>
  <Dialog.Overlay />
  <Dialog.Content variant="backlit">
    <Dialog.Title>Controllers</Dialog.Title>
    <Dialog.Description>…</Dialog.Description>
    {children}
    <Dialog.Close asChild><Button variant="ghost">Close</Button></Dialog.Close>
  </Dialog.Content>
</Dialog.Root>
```

Accessibility (focus trap, `aria-labelledby`, ESC, click-outside) inherited from Radix.

**Motion:** `data-state` hook + tokens. `data-[state=open]:animate-[fade-in_var(--duration-base)_var(--ease-standard)]`. Keyframes defined in `tokens.css`. No Framer Motion dep.

---

## 6. TV components

### `FocusFrame`

Ported from `packages/tv/src/components/FocusFrame.tsx`. Animated frame that tracks the focused tile via `transform` + `width/height` transitions.

- Stroke: `rgb(var(--color-focus))`
- Margin: `0.5vw` (inherited per CLAUDE.md)
- Motion: `var(--duration-base)` / `var(--ease-standard)`
- API: `<FocusFrame target={elementRef} visible={hasFocus} />` — consumer owns which element is focused.

### `SystemMenuOverlay`

Two-layer menu launched from mobile System button.

**L1 (root)** — three horizontally-arranged items, D-pad navigable, icon-above-label:

```tsx
<SystemMenuOverlay open={open} onOpenChange={setOpen}>
  <SystemMenuOverlay.Item icon={<ArrowLeft/>} onSelect={onResume}>Resume</SystemMenuOverlay.Item>
  <SystemMenuOverlay.Item icon={<Gamepad/>}   onSelect={() => setPanel('controllers')}>Controllers</SystemMenuOverlay.Item>
  <SystemMenuOverlay.Item icon={<X/>}         onSelect={onExitGame}>Exit Game</SystemMenuOverlay.Item>
</SystemMenuOverlay>
```

**Internal structure:** `Dialog` with `variant="backlit"` + horizontal flex of items. Icons from `lucide-react` (already a mobile dep; adding to TV).

**D-pad focus handling:** Radix Dialog covers focus trap + ESC. Arrow-key focus cycling implemented via a small `useRovingFocus` helper inside the component (specific to the 3-item layout; not promoted to a primitive).

**L2 (Controllers panel):** component composition, not a separate modal. When user picks "Controllers," `SystemMenuOverlay` swaps its body content to `<ControllersPanel onBack={() => setPanel('root')} />`. No modal-on-modal, no router.

**L2 (Exit Game):** calls `onExitGame` prop immediately. No confirmation in v1.

### `ControllersPanel`

```tsx
<ControllersPanel onBack={…}>
  <QRCard url={mobileUrl} />
  <RoomCodeDisplay code={roomCode} />
  <SlotList>{slots.map(s => <SlotCard key={s.id} slot={s} />)}</SlotList>
</ControllersPanel>
```

Layout: QR + code in a left column, slot list in a right column. One back affordance at the top.

### `QRCard`

- Wraps `qrcode.react` (already TV dep; also add to ui-weekend so component is self-contained)
- White card with QR + "Scan to join" label
- Props: `{ url: string; size?: number }` — default 240px for TV legibility, token-based padding

### `RoomCodeDisplay`

- 6 large characters in Weekend Repro Bold at a dedicated `--type-code` scale (~96px)
- Extra letter tracking for legibility at a distance
- Props: `{ code: string }` — render-only, no fetching

### `SlotCard`

**Core visual of "connection state as a first-class UI concept."** Maps cleanly to the PU&P party/slot types arriving in M2.

- Props: `{ slot: { id: string; state: 'waiting' | 'connecting' | 'connected'; name?: string; colorHex?: string } }`

| State | Visual |
|---|---|
| `waiting` | Dashed outline, muted fill, "Open slot" label |
| `connecting` | Solid outline, pulsing animation, "Connecting…" label + small spinner |
| `connected` | Solid fill with `colorHex` accent ring, player name shown, checkmark |

Uses `data-state` attribute so styles are declarative CSS and transitions happen in CSS — no JS-driven state transitions.

---

## 7. Mobile System-button slice

Goal: end-to-end System-menu flow testable in v1 without porting the full `TopBar`.

### `SystemButton`

- Renders context-aware badge: flat "W" on hub, game logo in game context.
- Props: `{ variant: 'hub' | 'game'; gameLogo?: ReactNode; onPress: () => void }`
- Visual: circular 44px tap target, subtle `--shadow-cta-glow` on press.
- Fires `onPress` only — button doesn't know about sockets; consumer wires it.

### Socket contract

Added to `packages/shared/src/constants.ts`:

```ts
SYSTEM_MENU_OPEN:   'system-menu:open',
SYSTEM_MENU_CLOSE:  'system-menu:close',
SYSTEM_MENU_ACTION: 'system-menu:action', // { action: 'resume' | 'exit' }
```

**Flow:**

1. Mobile taps `SystemButton` → emits `system-menu:open` with `{ roomCode }`.
2. Server forwards to the TV in that room (forward-only handler, no state).
3. TV's `SystemMenuOverlay` opens; it subscribes to this event.
4. User D-pad-navigates on TV remote. Phone does not mirror the full menu UI — its role is **trigger + close**.
5. TV emits `system-menu:close` back when menu dismisses, so mobile can clear any local "menu open" indicator.

### Minimal mobile host

`packages/mobile` gets a small wrapper that:

- Mounts `SystemButton`
- Listens for `system-menu:close` to clear local "menu open" state
- Lives in dev route `/ui-preview/system-menu` for isolated testing
- Is also integrated into the real `TopBar.tsx` as the **replacement** for the existing middle-position System button. The existing Back and Menu buttons remain untouched in Tier 2 — only the System button slot swaps to the ui-weekend import.

---

## 8. Dev preview routes

Guarded by `import.meta.env.DEV` — production bundles drop them. Neither TV nor mobile app currently has a router; adding `react-router-dom` (~10KB gzip) to both. The main app continues to render its current root when the path is `/`; `/ui-preview/*` paths render the preview shell.

### TV routes

```
/ui-preview
  ├── /tokens          # color swatches, type scale, radii, shadows
  ├── /button          # all variants × sizes, focus states
  ├── /dialog          # plain + backlit, trigger buttons
  ├── /focus-frame     # 3-tile grid, arrow keys cycle focus
  ├── /system-menu     # L1 + L2 (Controllers panel)
  ├── /controllers     # QRCard, RoomCodeDisplay, SlotCard state matrix
  └── /tinting         # 4 mock "games" with different --modal-tint overrides
```

### Mobile routes

```
/ui-preview
  ├── /tokens          # same as TV but at phone viewport
  ├── /button
  ├── /system-button   # hub variant + game variant
  └── /system-menu     # wiring test — tap button, see TV menu open
```

The mobile `/system-menu` story is the key end-to-end test: point a phone at a mock room code, tap System, watch TV overlay open in browser.

### Story format

Plain React components in `src/preview/stories/`. No args controls, no MDX.

```tsx
export default function ButtonStory() {
  return (
    <div className="grid gap-4 p-8">
      <section>
        <h3>Primary</h3>
        <div className="flex gap-2"><Button>Play</Button><Button size="lg">Play</Button></div>
      </section>
      <section><h3>Outline</h3>…</section>
    </div>
  );
}
```

A small `stories.tsx` index registers routes.

---

## 9. Port migration map

### Port from existing code

| From | To | Notes |
|---|---|---|
| `packages/tv/src/index.css` `@font-face` blocks | `packages/ui-weekend/src/tokens/fonts.css` | Switch URL from S3 to bundled `.woff2` served from ui-weekend |
| `packages/tv/src/components/FocusFrame.tsx` | `packages/ui-weekend/src/tv/FocusFrame.tsx` | Replace hardcoded `#FFE88B` with `rgb(var(--color-focus))` |
| `packages/tv/tailwind.config.js` | Stays; add preset | `theme.extend = {}` is fine — preset fills in |
| `packages/mobile/src/index.css` (`#00001f` bg) | Stays; edit to use `rgb(var(--color-bg))` after tokens.css loads | Small in-place edit |
| `packages/mobile/tailwind.config.js` | Stays; add preset | |
| `packages/mobile/src/components/TopBar.tsx` | **System-button slice extracted** → `packages/ui-weekend/src/mobile/SystemButton.tsx` | Rest of `TopBar` (Back, Menu, SettingsPanel trigger) stays in `packages/mobile` until Tier 3 |

### Files deleted after port

- `packages/tv/src/components/FocusFrame.tsx` — replaced by `@weekend/ui` import
- `@font-face` blocks in `packages/tv/src/index.css` — now loaded via `@weekend/ui/tokens/fonts.css`

### Untouched in v1 (follow-up specs)

`GameHub`, `GameTile`, `GamePreview`, all controller layouts (Square/DPad/Joystick/Trackpad/Gamepad), `VoiceGlow`, `RiveGameLogo`, `SettingsPanel`, full `TopBar` back/menu buttons.

### Install-time changes

```jsonc
// packages/ui-weekend/package.json
{
  "dependencies": {
    "@radix-ui/react-dialog": "^1",
    "@radix-ui/react-slot": "^1",
    "class-variance-authority": "^0.7",
    "lucide-react": "^0",
    "qrcode.react": "^4"
  }
}

// packages/tv/package.json and packages/mobile/package.json
{
  "dependencies": {
    "@weekend/ui": "*",
    "react-router-dom": "^6"
  }
}
```

### Migration ordering (feeds the implementation plan)

1. Scaffold `packages/ui-weekend/` (package.json, tsconfig, tailwind.preset).
2. Land `tokens.css`, `fonts.css`, Tailwind preset; wire TV + mobile.
3. Build `Button`, `Dialog`; add preview routes.
4. Port `FocusFrame`; delete old file.
5. Build `QRCard`, `RoomCodeDisplay`, `SlotCard`, `ControllersPanel`.
6. Build `SystemMenuOverlay`.
7. Add socket events + server forwarding.
8. Extract `SystemButton` from `TopBar`; wire emit.
9. End-to-end test: phone → server → TV menu opens.

Each step independently verifiable in preview routes.

---

## 10. Brand-guide reconciliation

From the Weekend Brand Guide PDF (47 pages, pages 1–25 had substantive content; 26–47 were motion/video placeholders):

| Brand rule | v1 impact |
|---|---|
| Logo: flat for product UI, 3D for brand moments, "Fat W" motif | `SystemButton` on hub uses flat W. 3D variants deferred. |
| Typography: **Primary = ABC Repro Medium** (= Weekend Repro on disk) | Used for all UI text via `--font-sans`. |
| Typography: **Secondary = Karl ST Medium** | **NOT for TV.** Available for mobile playful moments only — not loaded in v1 (no component needs it). |
| Typography: Tertiary = GT Super Text Book | Pitch decks / business materials only. Not used in product. Not loaded. |
| Open-source alternatives: Host Grotesk Semibold, Nunito Bold, STIX Two Text Regular | Listed as fallback options if licensing ever becomes a concern. Not used in v1. |

---

## 11. Acceptance criteria

v1 is done when:

1. `packages/ui-weekend/` exists as a workspace package and is installable by `packages/tv` and `packages/mobile`.
2. Both apps load `tokens.css` and `fonts.css` from ui-weekend; their Tailwind configs use the preset.
3. `Button` (primary/outline/ghost × sm/md/lg) and `Dialog` (plain/backlit) render in dev preview routes on both TV and mobile.
4. `FocusFrame` is ported; the old TV copy is deleted.
5. `SystemMenuOverlay` opens on TV when mobile `SystemButton` is pressed, via the new socket events.
6. `ControllersPanel` renders `QRCard`, `RoomCodeDisplay`, and three `SlotCard` states (waiting, connecting, connected) with token-based visuals.
7. Backlit dialog tint changes when wrapped in `<div style={{ '--modal-tint': '...' }}>` — demonstrable in the `/ui-preview/tinting` route.
8. `npm run typecheck` passes across the workspace.
9. Manual smoke test: phone → tap System → TV menu opens → navigate with TV arrow keys → select Controllers → see QR/code/slots → dismiss → phone gets close event.

---

## 12. Out of scope / future specs

Follow-up design specs will cover:

- **Tier 3 mobile UI** — full `TopBar` (Back + Menu), `SettingsPanel` port, haptics integration on all buttons, D-pad controller pattern docs, RiveEdgeGlow pattern doc, VoiceWave pattern doc.
- **PU&P M3 components** — `PartyRoster`, `LobbyHeader`, `NameEntryField`, `SpectatorView`.
- **PU&P M4 components** — `ReconnectWidget`, `Play-Again` flow.
- **Game-launched tinting contract** — how games formally declare their `--modal-tint` / `--modal-wash` / `--modal-wash-2` triples.
- **Light theme content work** — v1 builds the hook; content polish (`data-theme="light"` audit across components) is a later pass.
