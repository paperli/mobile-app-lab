# Weekend Design System v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `@weekend/ui` package — tokens, Button, Dialog, the TV System Menu flow (FocusFrame + SystemMenuOverlay + ControllersPanel with QRCard/RoomCodeDisplay/SlotCard), and the mobile SystemButton slice needed to trigger it end-to-end.

**Architecture:** A workspace package `packages/ui-weekend` exporting React components. Tokens live in CSS custom properties + a Tailwind preset. Radix Primitives underneath Weekend chrome. Dev preview routes in both apps (under `/ui-preview`) use `react-router-dom`. Port existing working code (`FocusFrame`) rather than rewrite. No automated tests — verification is typecheck + visual check in preview routes + end-to-end smoke test for socket flow.

**Tech Stack:** React 18, TypeScript 5.3, Vite 5, Tailwind 3.4, Radix UI (`@radix-ui/react-dialog`, `@radix-ui/react-slot`), `class-variance-authority`, `lucide-react`, `qrcode.react`, `react-router-dom` 6, socket.io. No test framework (project has zero tests by design).

**Spec:** `docs/superpowers/specs/2026-04-20-weekend-design-system-design.md`

---

## File Map

**New files in `packages/ui-weekend/`:**
- `package.json`, `tsconfig.json`, `tailwind.preset.js`, `README.md`
- `src/index.ts` — flat re-exports
- `src/tokens/tokens.css` — CSS variables + light-theme override + keyframes
- `src/tokens/fonts.css` — @font-face blocks for Weekend Repro
- `src/tokens/index.ts` — TS token name constants
- `src/tokens/fonts/WeekendRepro-{Regular,Medium,Bold}.woff2` — copied from `packages/shared/public/fonts/`
- `src/primitives/Button.tsx`, `src/primitives/Dialog.tsx`, `src/primitives/index.ts`
- `src/tv/FocusFrame.tsx`, `src/tv/SystemMenuOverlay.tsx`, `src/tv/ControllersPanel.tsx`, `src/tv/QRCard.tsx`, `src/tv/RoomCodeDisplay.tsx`, `src/tv/SlotCard.tsx`, `src/tv/index.ts`
- `src/mobile/SystemButton.tsx`, `src/mobile/index.ts`

**New files in consumer packages:**
- `packages/tv/src/preview/PreviewShell.tsx` and story files
- `packages/mobile/src/preview/PreviewShell.tsx` and story files

**Modified files:**
- `packages/tv/package.json` — add `@weekend/ui`, `react-router-dom`, `@radix-ui/*` (peer resolution)
- `packages/tv/tailwind.config.js` — add preset
- `packages/tv/src/index.css` — remove @font-face blocks
- `packages/tv/src/main.tsx` — import token CSS, wrap App with Router
- `packages/tv/src/App.tsx` — use Routes; add `/ui-preview/*`
- `packages/mobile/package.json` — add `@weekend/ui`, `react-router-dom`
- `packages/mobile/tailwind.config.js` — add preset
- `packages/mobile/src/index.css` — use token variable for bg
- `packages/mobile/src/main.tsx` — import token CSS, wrap App with Router
- `packages/mobile/src/App.tsx` — use Routes; add `/ui-preview/*`
- `packages/mobile/src/components/TopBar.tsx` — swap middle button for `SystemButton`
- `packages/shared/src/constants.ts` — add `SYSTEM_MENU_*` events
- `packages/server/src/socket-handler.ts` — forward system-menu events

**Deleted after port:**
- `packages/tv/src/components/FocusFrame.tsx`

---

## Task 1: Scaffold `@weekend/ui` package

**Files:**
- Create: `packages/ui-weekend/package.json`
- Create: `packages/ui-weekend/tsconfig.json`
- Create: `packages/ui-weekend/src/index.ts`
- Create: `packages/ui-weekend/README.md`

- [ ] **Step 1: Create `packages/ui-weekend/package.json`**

```json
{
  "name": "@weekend/ui",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./tailwind.preset": "./tailwind.preset.js",
    "./tokens/tokens.css": "./src/tokens/tokens.css",
    "./tokens/fonts.css": "./src/tokens/fonts.css"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-slot": "^1.1.0",
    "class-variance-authority": "^0.7.0",
    "lucide-react": "^0.562.0",
    "qrcode.react": "^4.2.0"
  },
  "peerDependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    "typescript": "^5.3.3"
  }
}
```

Note: `main`/`types` point to `src/index.ts`; Vite compiles TS/JSX through the workspace import, so no build step needed. This matches how ui-weekend is consumed (browser-only, no Node server consumers).

- [ ] **Step 2: Create `packages/ui-weekend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/ui-weekend/src/index.ts`** (empty placeholder — will populate in later tasks)

```ts
// Token CSS files are side-effect imports; see README.
export {};
```

- [ ] **Step 4: Create `packages/ui-weekend/README.md`**

```markdown
# @weekend/ui

Weekend design system for the mobile-app-lab prototype. Radix Primitives + tokens + Weekend brand chrome.

## Install (workspace consumers)

Add to your package.json dependencies:

    "@weekend/ui": "*"

Then run `npm install` from the monorepo root.

## Setup

1. Import tokens once in your app entry (e.g. `main.tsx`):

       import '@weekend/ui/tokens/tokens.css';
       import '@weekend/ui/tokens/fonts.css';

2. Extend Tailwind config:

       // tailwind.config.js
       module.exports = {
         presets: [require('@weekend/ui/tailwind.preset')],
         content: ['./src/**/*.{ts,tsx}'],
       };

3. Use components:

       import { Button, Dialog } from '@weekend/ui';
```

- [ ] **Step 5: Install and typecheck**

Run from repo root:
```bash
npm install
npm run typecheck
```
Expected: install completes, typecheck passes (typecheck includes new workspace via `--workspaces --if-present` root script; ui-weekend's script runs).

- [ ] **Step 6: Commit**

```bash
git add packages/ui-weekend/
git commit -m "Scaffold @weekend/ui workspace package"
```

---

## Task 2: Tokens and Tailwind preset

**Files:**
- Create: `packages/ui-weekend/src/tokens/tokens.css`
- Create: `packages/ui-weekend/src/tokens/fonts.css`
- Create: `packages/ui-weekend/src/tokens/fonts/WeekendRepro-Regular.woff2`
- Create: `packages/ui-weekend/src/tokens/fonts/WeekendRepro-Medium.woff2`
- Create: `packages/ui-weekend/src/tokens/fonts/WeekendRepro-Bold.woff2`
- Create: `packages/ui-weekend/src/tokens/index.ts`
- Create: `packages/ui-weekend/tailwind.preset.js`

- [ ] **Step 1: Copy font files**

```bash
mkdir -p packages/ui-weekend/src/tokens/fonts
cp packages/shared/public/fonts/Weekend*Repro/WeekendRepro-Regular.woff2 packages/ui-weekend/src/tokens/fonts/ 2>/dev/null || \
  cp "packages/shared/public/fonts/Weekend Repro/WeekendRepro-Regular.woff2" packages/ui-weekend/src/tokens/fonts/
cp packages/shared/public/fonts/Weekend*Repro/WeekendRepro-Medium.woff2 packages/ui-weekend/src/tokens/fonts/ 2>/dev/null || \
  cp "packages/shared/public/fonts/Weekend Repro/WeekendRepro-Medium.woff2" packages/ui-weekend/src/tokens/fonts/
cp packages/shared/public/fonts/Weekend*Repro/WeekendRepro-Bold.woff2 packages/ui-weekend/src/tokens/fonts/ 2>/dev/null || \
  cp "packages/shared/public/fonts/Weekend Repro/WeekendRepro-Bold.woff2" packages/ui-weekend/src/tokens/fonts/
ls packages/ui-weekend/src/tokens/fonts/
```

Expected: three `.woff2` files listed.

- [ ] **Step 2: Create `packages/ui-weekend/src/tokens/fonts.css`**

```css
@font-face {
  font-family: 'Weekend Repro';
  src: url('./fonts/WeekendRepro-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Weekend Repro';
  src: url('./fonts/WeekendRepro-Medium.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Weekend Repro';
  src: url('./fonts/WeekendRepro-Bold.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
```

- [ ] **Step 3: Create `packages/ui-weekend/src/tokens/tokens.css`**

```css
:root {
  /* Layer 1 — primitive palette (rgb channels for Tailwind <alpha-value>) */
  --palette-yellow-300: 255 232 139;   /* #FFE88B */
  --palette-yellow-500: 246 211 0;     /* #F6D300 */
  --palette-cyan-400:   49 204 242;    /* #31CCF2 */
  --palette-indigo-500: 94 131 253;    /* #5E83FD */
  --palette-ink-950:    0 0 31;        /* #00001f mobile bg */
  --palette-ink-900:    10 14 40;      /* TV bg */
  --palette-white:      255 255 255;
  --palette-grey-500:   128 128 140;
  --palette-grey-700:   64 64 80;
  --palette-red-500:    239 68 68;

  /* Layer 2 — semantic tokens */
  --color-bg:           var(--palette-ink-950);
  --color-bg-elevated:  var(--palette-ink-900);
  --color-fg:           var(--palette-white);
  --color-fg-muted:     255 255 255 / 0.6;
  --color-brand:        var(--palette-yellow-300);
  --color-action:       var(--palette-yellow-300);
  --color-focus:        var(--palette-yellow-300);
  --color-modal-stroke: var(--palette-cyan-400);
  --color-modal-wash:   var(--palette-cyan-400);
  --color-modal-wash-2: var(--palette-indigo-500);

  /* Per-game tint — scoped overrides replace these */
  --modal-tint:   var(--color-modal-stroke);
  --modal-wash:   var(--color-modal-wash);
  --modal-wash-2: var(--color-modal-wash-2);

  /* Type, spacing, radii, motion */
  --font-sans:       'Weekend Repro', ui-sans-serif, system-ui, sans-serif;
  --type-code:       96px;
  --radius-pill:     9999px;
  --radius-card:     16px;
  --duration-fast:   150ms;
  --duration-base:   220ms;
  --ease-standard:   cubic-bezier(0.4, 0, 0.2, 1);
  --shadow-cta-glow: 0 4px 20px 0 rgba(255, 228, 1, 0.35);
}

[data-theme='light'] {
  --color-bg:          var(--palette-white);
  --color-bg-elevated: 245 245 247;
  --color-fg:          var(--palette-ink-950);
  --color-fg-muted:    0 0 31 / 0.6;
}

/* Motion keyframes used by Dialog and others */
@keyframes weekend-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes weekend-fade-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}

@keyframes weekend-scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}

@keyframes weekend-scale-out {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.95); }
}

@keyframes weekend-slot-pulse {
  0%, 100% { opacity: 0.6; }
  50%      { opacity: 1; }
}
```

- [ ] **Step 4: Create `packages/ui-weekend/src/tokens/index.ts`**

```ts
// TS-side token name constants (for consumers that need them in code, not CSS).
// Kept minimal — most usage flows through Tailwind utilities or raw CSS var references.
export const tokens = {
  duration: {
    fast: 150,
    base: 220,
  },
  easing: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;
```

- [ ] **Step 5: Create `packages/ui-weekend/tailwind.preset.js`**

```js
/** @type {import('tailwindcss').Config} */
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
      fontFamily: {
        sans: 'var(--font-sans)',
      },
      borderRadius: {
        pill: 'var(--radius-pill)',
        card: 'var(--radius-card)',
      },
      boxShadow: {
        'cta-glow': 'var(--shadow-cta-glow)',
      },
      transitionDuration: {
        fast: '150ms',
        base: '220ms',
      },
      keyframes: {
        'fade-in':  { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-out': { from: { opacity: '1' }, to: { opacity: '0' } },
      },
    },
  },
};
```

- [ ] **Step 6: Update `packages/ui-weekend/src/index.ts`**

```ts
export * from './tokens/index.js';
```

- [ ] **Step 7: Commit**

```bash
git add packages/ui-weekend/
git commit -m "Add tokens.css, fonts.css, and Tailwind preset to @weekend/ui"
```

---

## Task 3: Wire tokens into TV app

**Files:**
- Modify: `packages/tv/package.json` — add `@weekend/ui` dep
- Modify: `packages/tv/tailwind.config.js` — use preset
- Modify: `packages/tv/src/index.css` — remove @font-face blocks
- Modify: `packages/tv/src/main.tsx` — import token CSS

- [ ] **Step 1: Read current TV tailwind config**

Run: `cat packages/tv/tailwind.config.js`

- [ ] **Step 2: Add `@weekend/ui` to `packages/tv/package.json` dependencies**

Edit the `dependencies` block to include `"@weekend/ui": "*"`:

```json
"dependencies": {
  "@mobile-app-lab/shared": "*",
  "@weekend/ui": "*",
  "qrcode.react": "^4.2.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "socket.io-client": "^4.7.2"
},
```

- [ ] **Step 3: Update `packages/tv/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('@weekend/ui/tailwind.preset')],
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

- [ ] **Step 4: Remove @font-face blocks from `packages/tv/src/index.css`**

Replace the entire file with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Responsive TV viewport - targets 1920x1080 but adapts to screen size */
html,
body,
#root {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
}

body {
  font-family: var(--font-sans);
  line-height: 1.2;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

- [ ] **Step 5: Import token CSS in `packages/tv/src/main.tsx`**

Read current file first: `cat packages/tv/src/main.tsx`

Add these two imports at the top (above existing imports):

```tsx
import '@weekend/ui/tokens/fonts.css';
import '@weekend/ui/tokens/tokens.css';
```

- [ ] **Step 6: Install and typecheck**

```bash
npm install
npm run typecheck
```
Expected: install resolves `@weekend/ui` workspace dep; typecheck passes.

- [ ] **Step 7: Start TV dev server and verify tokens load**

```bash
npm run dev:tv
```
Open https://localhost:5173, open devtools, confirm `:root` has `--color-brand` etc. (Inspect `<html>`, check Computed Styles.) Expected: body text is in Weekend Repro font; no regression vs. previous look.

- [ ] **Step 8: Commit**

```bash
git add packages/tv/package.json packages/tv/tailwind.config.js packages/tv/src/index.css packages/tv/src/main.tsx package-lock.json
git commit -m "Wire @weekend/ui tokens into TV app"
```

---

## Task 4: Wire tokens into mobile app

**Files:**
- Modify: `packages/mobile/package.json`
- Modify: `packages/mobile/tailwind.config.js`
- Modify: `packages/mobile/src/index.css`
- Modify: `packages/mobile/src/main.tsx`

- [ ] **Step 1: Add `@weekend/ui` to `packages/mobile/package.json` dependencies**

Edit `dependencies` to include `"@weekend/ui": "*"`:

```json
"dependencies": {
  "@mobile-app-lab/shared": "*",
  "@rive-app/react-canvas": "^4.27.3",
  "@rive-app/react-webgl2": "^4.27.3",
  "@weekend/ui": "*",
  "fuse.js": "^7.1.0",
  "lucide-react": "^0.562.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "socket.io-client": "^4.7.2"
},
```

- [ ] **Step 2: Update `packages/mobile/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('@weekend/ui/tailwind.preset')],
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

- [ ] **Step 3: Update `packages/mobile/src/index.css`** — use token variable for bg

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body,
#root {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  -webkit-overflow-scrolling: touch;
  background-color: rgb(var(--color-bg));
}

body {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  touch-action: none;
}

body {
  overscroll-behavior: none;
}
```

- [ ] **Step 4: Import token CSS in `packages/mobile/src/main.tsx`**

Read current: `cat packages/mobile/src/main.tsx`

Add at the top:

```tsx
import '@weekend/ui/tokens/fonts.css';
import '@weekend/ui/tokens/tokens.css';
```

- [ ] **Step 5: Install and typecheck**

```bash
npm install
npm run typecheck
```

- [ ] **Step 6: Start mobile dev server and verify**

```bash
npm run dev:mobile
```
Open https://localhost:5174. Expected: bg still `#00001f`-ish (now via token); body uses Weekend Repro font.

- [ ] **Step 7: Commit**

```bash
git add packages/mobile/package.json packages/mobile/tailwind.config.js packages/mobile/src/index.css packages/mobile/src/main.tsx package-lock.json
git commit -m "Wire @weekend/ui tokens into mobile app"
```

---

## Task 5: Add router + preview shell to TV

**Files:**
- Modify: `packages/tv/package.json` — add `react-router-dom`
- Modify: `packages/tv/src/main.tsx` — wrap in `BrowserRouter`
- Modify: `packages/tv/src/App.tsx` — use `Routes`
- Create: `packages/tv/src/preview/PreviewShell.tsx`
- Create: `packages/tv/src/preview/stories/index.ts`

- [ ] **Step 1: Add `react-router-dom` to TV dependencies**

```json
"dependencies": {
  "@mobile-app-lab/shared": "*",
  "@weekend/ui": "*",
  "qrcode.react": "^4.2.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.26.0",
  "socket.io-client": "^4.7.2"
},
```

- [ ] **Step 2: Install**

```bash
npm install
```

- [ ] **Step 3: Read current `packages/tv/src/App.tsx` and `main.tsx`**

```bash
cat packages/tv/src/App.tsx packages/tv/src/main.tsx
```

Understand: current `App.tsx` likely renders `GameHub` directly. Record its current root render.

- [ ] **Step 4: Wrap app in `BrowserRouter` in `packages/tv/src/main.tsx`**

Add `BrowserRouter` import and wrap `<App />`:

```tsx
import '@weekend/ui/tokens/fonts.css';
import '@weekend/ui/tokens/tokens.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

(Preserve any other existing imports; add `BrowserRouter` wrap around `<App />`.)

- [ ] **Step 5: Update `packages/tv/src/App.tsx` to use Routes**

Add `/ui-preview/*` route in dev mode. Preserve all existing behavior when path is `/`. Assuming existing App returns `<MainTvUi />` (the actual component name varies):

```tsx
import { Routes, Route } from 'react-router-dom';
import { PreviewShell } from './preview/PreviewShell';
// ... existing imports

function App() {
  return (
    <Routes>
      <Route path="/" element={<ExistingMainUi />} />
      {import.meta.env.DEV && <Route path="/ui-preview/*" element={<PreviewShell />} />}
    </Routes>
  );
}

export default App;
```

Replace `<ExistingMainUi />` with whatever `App.tsx` currently renders. Preserve all existing state/effects by extracting them into a new component if needed. If current `App.tsx` is small, the simpler path is to inline its logic directly as the element for `path="/"`.

- [ ] **Step 6: Create `packages/tv/src/preview/PreviewShell.tsx`**

```tsx
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { stories } from './stories';

export function PreviewShell() {
  const location = useLocation();
  return (
    <div className="flex w-full h-full bg-bg text-fg font-sans">
      <nav className="w-60 h-full border-r border-fg/10 p-4 overflow-y-auto">
        <h1 className="text-lg font-bold mb-4">UI Preview</h1>
        <ul className="space-y-1">
          {stories.map((s) => {
            const active = location.pathname === `/ui-preview/${s.slug}`;
            return (
              <li key={s.slug}>
                <Link
                  to={`/ui-preview/${s.slug}`}
                  className={`block px-3 py-2 rounded-card text-sm ${
                    active ? 'bg-fg/10' : 'hover:bg-fg/5'
                  }`}
                >
                  {s.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <main className="flex-1 h-full overflow-auto p-8">
        <Routes>
          {stories.map((s) => (
            <Route key={s.slug} path={s.slug} element={<s.Component />} />
          ))}
          <Route path="*" element={<div className="text-fg-muted">Pick a story from the left.</div>} />
        </Routes>
      </main>
    </div>
  );
}
```

- [ ] **Step 7: Create `packages/tv/src/preview/stories/index.ts` (empty story list for now)**

```ts
import type { ComponentType } from 'react';

export interface Story {
  slug: string;
  label: string;
  Component: ComponentType;
}

export const stories: Story[] = [];
```

- [ ] **Step 8: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 9: Start TV and verify**

```bash
npm run dev:tv
```

Visit https://localhost:5173/ — existing TV UI still renders at root.
Visit https://localhost:5173/ui-preview — preview shell renders with empty sidebar.

- [ ] **Step 10: Commit**

```bash
git add packages/tv/package.json packages/tv/src package-lock.json
git commit -m "Add react-router-dom and /ui-preview shell to TV app"
```

---

## Task 6: Add router + preview shell to mobile

**Files:**
- Modify: `packages/mobile/package.json`
- Modify: `packages/mobile/src/main.tsx`
- Modify: `packages/mobile/src/App.tsx`
- Create: `packages/mobile/src/preview/PreviewShell.tsx`
- Create: `packages/mobile/src/preview/stories/index.ts`

- [ ] **Step 1: Add `react-router-dom` to mobile dependencies**

```json
"dependencies": {
  "@mobile-app-lab/shared": "*",
  "@rive-app/react-canvas": "^4.27.3",
  "@rive-app/react-webgl2": "^4.27.3",
  "@weekend/ui": "*",
  "fuse.js": "^7.1.0",
  "lucide-react": "^0.562.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.26.0",
  "socket.io-client": "^4.7.2"
},
```

- [ ] **Step 2: Install**

```bash
npm install
```

- [ ] **Step 3: Wrap mobile app in `BrowserRouter`**

Edit `packages/mobile/src/main.tsx`:

```tsx
import '@weekend/ui/tokens/fonts.css';
import '@weekend/ui/tokens/tokens.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 4: Update `packages/mobile/src/App.tsx` with Routes**

```tsx
import { Routes, Route } from 'react-router-dom';
import { PreviewShell } from './preview/PreviewShell';
// existing imports

function App() {
  return (
    <Routes>
      <Route path="/" element={<ExistingMobileUi />} />
      {import.meta.env.DEV && <Route path="/ui-preview/*" element={<PreviewShell />} />}
    </Routes>
  );
}

export default App;
```

Replace `<ExistingMobileUi />` with current App body (extract into its own component if App has local state).

- [ ] **Step 5: Create `packages/mobile/src/preview/PreviewShell.tsx`**

Mobile preview uses a dropdown instead of a sidebar (phone viewport is narrow).

```tsx
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { stories } from './stories';

export function PreviewShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const current = stories.find((s) => location.pathname === `/ui-preview/${s.slug}`);

  return (
    <div className="w-full h-full bg-bg text-fg font-sans flex flex-col">
      <div className="p-3 border-b border-fg/10 flex items-center gap-2">
        <span className="text-sm text-fg-muted">UI Preview:</span>
        <select
          className="bg-bg-elevated text-fg px-2 py-1 rounded-card text-sm flex-1"
          value={current?.slug ?? ''}
          onChange={(e) => navigate(`/ui-preview/${e.target.value}`)}
        >
          <option value="" disabled>Pick a story…</option>
          {stories.map((s) => (
            <option key={s.slug} value={s.slug}>{s.label}</option>
          ))}
        </select>
      </div>
      <main className="flex-1 overflow-auto p-4">
        <Routes>
          {stories.map((s) => (
            <Route key={s.slug} path={s.slug} element={<s.Component />} />
          ))}
          <Route path="*" element={<div className="text-fg-muted">Pick a story above.</div>} />
        </Routes>
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Create `packages/mobile/src/preview/stories/index.ts`**

```ts
import type { ComponentType } from 'react';

export interface Story {
  slug: string;
  label: string;
  Component: ComponentType;
}

export const stories: Story[] = [];
```

- [ ] **Step 7: Typecheck and verify**

```bash
npm run typecheck
npm run dev:mobile
```

Visit https://localhost:5174/ — existing mobile UI works.
Visit https://localhost:5174/ui-preview — preview shell with empty dropdown.

- [ ] **Step 8: Commit**

```bash
git add packages/mobile/package.json packages/mobile/src package-lock.json
git commit -m "Add react-router-dom and /ui-preview shell to mobile app"
```

---

## Task 7: `Button` primitive + preview stories

**Files:**
- Create: `packages/ui-weekend/src/primitives/Button.tsx`
- Create: `packages/ui-weekend/src/primitives/index.ts`
- Modify: `packages/ui-weekend/src/index.ts`
- Create: `packages/tv/src/preview/stories/Button.tsx`
- Modify: `packages/tv/src/preview/stories/index.ts`
- Create: `packages/mobile/src/preview/stories/Button.tsx`
- Modify: `packages/mobile/src/preview/stories/index.ts`

- [ ] **Step 1: Create `packages/ui-weekend/src/primitives/Button.tsx`**

```tsx
import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonStyles = cva(
  'inline-flex items-center justify-center gap-2 font-medium select-none transition-[transform,opacity] duration-fast ease-[var(--ease-standard)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary:
          'rounded-pill bg-[linear-gradient(180deg,#FFE88B_0%,#F6D300_94.88%)] text-[rgb(var(--palette-ink-950))] shadow-cta-glow',
        outline:
          'rounded-pill border border-fg/20 text-fg bg-transparent hover:bg-fg/5',
        ghost:
          'rounded-pill text-fg bg-transparent hover:bg-fg/10',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-5 text-base',
        lg: 'h-14 px-7 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonStyles> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild, variant, size, className, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={[buttonStyles({ variant, size }), className].filter(Boolean).join(' ')}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
```

- [ ] **Step 2: Create `packages/ui-weekend/src/primitives/index.ts`**

```ts
export { Button, type ButtonProps } from './Button';
```

- [ ] **Step 3: Update `packages/ui-weekend/src/index.ts`**

```ts
export * from './tokens/index.js';
export * from './primitives/index.js';
```

- [ ] **Step 4: Create `packages/tv/src/preview/stories/Button.tsx`**

```tsx
import { Button } from '@weekend/ui';

export default function ButtonStory() {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-xl font-bold mb-3">Primary</h2>
        <div className="flex gap-3 items-center">
          <Button size="sm">Play</Button>
          <Button size="md">Play</Button>
          <Button size="lg">Play</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>
      <section>
        <h2 className="text-xl font-bold mb-3">Outline</h2>
        <div className="flex gap-3 items-center">
          <Button variant="outline" size="sm">Cancel</Button>
          <Button variant="outline" size="md">Cancel</Button>
          <Button variant="outline" size="lg">Cancel</Button>
        </div>
      </section>
      <section>
        <h2 className="text-xl font-bold mb-3">Ghost</h2>
        <div className="flex gap-3 items-center">
          <Button variant="ghost" size="sm">Skip</Button>
          <Button variant="ghost" size="md">Skip</Button>
          <Button variant="ghost" size="lg">Skip</Button>
        </div>
      </section>
      <section>
        <h2 className="text-xl font-bold mb-3">Focus state</h2>
        <p className="text-fg-muted text-sm mb-2">Tab into this button to see focus ring.</p>
        <Button>Focus me</Button>
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Register in `packages/tv/src/preview/stories/index.ts`**

```ts
import type { ComponentType } from 'react';
import ButtonStory from './Button';

export interface Story {
  slug: string;
  label: string;
  Component: ComponentType;
}

export const stories: Story[] = [
  { slug: 'button', label: 'Button', Component: ButtonStory },
];
```

- [ ] **Step 6: Create `packages/mobile/src/preview/stories/Button.tsx`**

```tsx
import { Button } from '@weekend/ui';

export default function ButtonStory() {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="text-lg font-bold mb-2">Primary</h2>
        <div className="flex flex-col gap-2">
          <Button size="sm">Play</Button>
          <Button size="md">Play</Button>
          <Button size="lg">Play</Button>
        </div>
      </section>
      <section>
        <h2 className="text-lg font-bold mb-2">Outline</h2>
        <div className="flex flex-col gap-2">
          <Button variant="outline">Cancel</Button>
        </div>
      </section>
      <section>
        <h2 className="text-lg font-bold mb-2">Ghost</h2>
        <div className="flex flex-col gap-2">
          <Button variant="ghost">Skip</Button>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 7: Register in `packages/mobile/src/preview/stories/index.ts`**

```ts
import type { ComponentType } from 'react';
import ButtonStory from './Button';

export interface Story {
  slug: string;
  label: string;
  Component: ComponentType;
}

export const stories: Story[] = [
  { slug: 'button', label: 'Button', Component: ButtonStory },
];
```

- [ ] **Step 8: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 9: Visual check**

```bash
npm run dev:tv
```
Visit https://localhost:5173/ui-preview/button. Expected: 3 primary sizes with yellow gradient + glow shadow; outline buttons are transparent with white border; ghost buttons are text-only. Tab into "Focus me" → see yellow focus ring.

```bash
npm run dev:mobile
```
Visit https://localhost:5174/ui-preview/button. Same buttons stacked vertically on narrow viewport.

- [ ] **Step 10: Commit**

```bash
git add packages/ui-weekend/src packages/tv/src/preview packages/mobile/src/preview
git commit -m "Add Button primitive with primary/outline/ghost variants and preview stories"
```

---

## Task 8: `Dialog` primitive (plain + backlit) + stories

**Files:**
- Create: `packages/ui-weekend/src/primitives/Dialog.tsx`
- Modify: `packages/ui-weekend/src/primitives/index.ts`
- Create: `packages/tv/src/preview/stories/Dialog.tsx`
- Modify: `packages/tv/src/preview/stories/index.ts`

- [ ] **Step 1: Create `packages/ui-weekend/src/primitives/Dialog.tsx`**

```tsx
import { forwardRef } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';

const contentStyles = cva(
  'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 text-fg font-sans focus:outline-none data-[state=open]:animate-[weekend-scale-in_var(--duration-base)_var(--ease-standard)] data-[state=closed]:animate-[weekend-scale-out_var(--duration-fast)_var(--ease-standard)]',
  {
    variants: {
      variant: {
        plain:
          'bg-bg-elevated rounded-card shadow-2xl p-8 max-w-lg w-[calc(100vw-2rem)]',
        backlit:
          'p-8 max-w-3xl w-[calc(100vw-2rem)]',
      },
    },
    defaultVariants: { variant: 'plain' },
  },
);

export interface DialogContentProps
  extends RadixDialog.DialogContentProps,
    VariantProps<typeof contentStyles> {}

const Root = RadixDialog.Root;
const Trigger = RadixDialog.Trigger;
const Portal = RadixDialog.Portal;
const Title = RadixDialog.Title;
const Description = RadixDialog.Description;
const Close = RadixDialog.Close;

const Overlay = forwardRef<HTMLDivElement, RadixDialog.DialogOverlayProps>(
  ({ className, ...props }, ref) => (
    <RadixDialog.Overlay
      ref={ref}
      className={[
        'fixed inset-0 z-40 bg-black/60 data-[state=open]:animate-[weekend-fade-in_var(--duration-base)_var(--ease-standard)] data-[state=closed]:animate-[weekend-fade-out_var(--duration-fast)_var(--ease-standard)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  ),
);
Overlay.displayName = 'Dialog.Overlay';

const Content = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ variant, className, children, ...props }, ref) => {
    return (
      <RadixDialog.Content
        ref={ref}
        className={[contentStyles({ variant }), className].filter(Boolean).join(' ')}
        {...props}
      >
        {variant === 'backlit' ? (
          <>
            {/* Wash layer — radial gradient wash, heavily blurred */}
            <div
              aria-hidden
              className="absolute inset-0 -z-10 rounded-card"
              style={{
                background:
                  'radial-gradient(circle at 50% 50%, rgb(var(--modal-wash)) 0%, rgb(var(--modal-wash-2)) 80%)',
                filter: 'blur(64px)',
                opacity: 0.5,
              }}
            />
            {/* Stroke layer — cyan 4px ring, lightly blurred */}
            <div
              aria-hidden
              className="absolute -inset-[2px] -z-10 rounded-card"
              style={{
                border: '4px solid rgb(var(--modal-tint))',
                filter: 'blur(6px)',
                opacity: 0.75,
              }}
            />
            {/* Solid content panel */}
            <div className="relative rounded-card bg-bg-elevated/90 backdrop-blur-sm p-6">
              {children}
            </div>
          </>
        ) : (
          children
        )}
      </RadixDialog.Content>
    );
  },
);
Content.displayName = 'Dialog.Content';

export const Dialog = {
  Root,
  Trigger,
  Portal,
  Overlay,
  Content,
  Title,
  Description,
  Close,
};
```

- [ ] **Step 2: Update `packages/ui-weekend/src/primitives/index.ts`**

```ts
export { Button, type ButtonProps } from './Button';
export { Dialog, type DialogContentProps } from './Dialog';
```

- [ ] **Step 3: Create `packages/tv/src/preview/stories/Dialog.tsx`**

```tsx
import { useState } from 'react';
import { Dialog, Button } from '@weekend/ui';

export default function DialogStory() {
  const [plainOpen, setPlainOpen] = useState(false);
  const [backlitOpen, setBacklitOpen] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-xl font-bold mb-3">Plain dialog</h2>
        <Button onClick={() => setPlainOpen(true)}>Open plain</Button>
        <Dialog.Root open={plainOpen} onOpenChange={setPlainOpen}>
          <Dialog.Portal>
            <Dialog.Overlay />
            <Dialog.Content variant="plain">
              <Dialog.Title className="text-2xl font-bold mb-2">Plain dialog</Dialog.Title>
              <Dialog.Description className="text-fg-muted mb-6">
                Flat panel, standard drop shadow.
              </Dialog.Description>
              <Dialog.Close asChild>
                <Button variant="ghost">Close</Button>
              </Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">Backlit dialog</h2>
        <Button onClick={() => setBacklitOpen(true)}>Open backlit</Button>
        <Dialog.Root open={backlitOpen} onOpenChange={setBacklitOpen}>
          <Dialog.Portal>
            <Dialog.Overlay />
            <Dialog.Content variant="backlit">
              <Dialog.Title className="text-3xl font-bold mb-2">Backlit dialog</Dialog.Title>
              <Dialog.Description className="text-fg-muted mb-6">
                Cyan stroke blur + radial wash behind the panel. Signature Weekend chrome.
              </Dialog.Description>
              <Dialog.Close asChild>
                <Button variant="outline">Close</Button>
              </Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Register in `packages/tv/src/preview/stories/index.ts`**

```ts
import type { ComponentType } from 'react';
import ButtonStory from './Button';
import DialogStory from './Dialog';

export interface Story {
  slug: string;
  label: string;
  Component: ComponentType;
}

export const stories: Story[] = [
  { slug: 'button', label: 'Button', Component: ButtonStory },
  { slug: 'dialog', label: 'Dialog', Component: DialogStory },
];
```

- [ ] **Step 5: Typecheck and visual check**

```bash
npm run typecheck
npm run dev:tv
```

Visit https://localhost:5173/ui-preview/dialog.
- Click "Open plain" → centered panel on dark scrim, clean drop shadow. ESC closes. Click outside closes.
- Click "Open backlit" → same but with cyan-ringed blurred halo + radial color wash behind the panel. Animation feels smooth.

- [ ] **Step 6: Commit**

```bash
git add packages/ui-weekend/src packages/tv/src/preview
git commit -m "Add Dialog primitive with plain and backlit variants"
```

---

## Task 9: Per-game tinting story

**Files:**
- Create: `packages/tv/src/preview/stories/Tinting.tsx`
- Modify: `packages/tv/src/preview/stories/index.ts`

- [ ] **Step 1: Create `packages/tv/src/preview/stories/Tinting.tsx`**

```tsx
import { useState } from 'react';
import { Dialog, Button } from '@weekend/ui';

interface GameTint {
  name: string;
  tint: string;
  wash: string;
  wash2: string;
}

const GAMES: GameTint[] = [
  { name: 'Default (cyan/indigo)', tint: '49 204 242',   wash: '49 204 242',  wash2: '94 131 253'  },
  { name: 'Song Quiz (pink)',      tint: '255 79 178',   wash: '255 79 178',  wash2: '180 50 130'  },
  { name: 'Trivia (green)',        tint: '80 220 140',   wash: '80 220 140',  wash2: '40 120 80'   },
  { name: 'Storm (amber)',         tint: '255 170 50',   wash: '255 170 50',  wash2: '200 80 20'   },
];

export default function TintingStory() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold">Per-game modal tinting</h2>
      <p className="text-fg-muted">
        Each wrapper scopes <code>--modal-tint</code>, <code>--modal-wash</code>, and{' '}
        <code>--modal-wash-2</code>. Same Dialog component, different game context.
      </p>
      <div className="grid grid-cols-2 gap-4">
        {GAMES.map((game, i) => (
          <div
            key={game.name}
            style={{
              ['--modal-tint' as string]: game.tint,
              ['--modal-wash' as string]: game.wash,
              ['--modal-wash-2' as string]: game.wash2,
            }}
            className="p-6 rounded-card bg-bg-elevated flex flex-col gap-3"
          >
            <h3 className="font-bold">{game.name}</h3>
            <Button onClick={() => setOpenIdx(i)}>Open dialog</Button>
            <Dialog.Root open={openIdx === i} onOpenChange={(o) => setOpenIdx(o ? i : null)}>
              <Dialog.Portal>
                <Dialog.Overlay />
                <Dialog.Content variant="backlit">
                  <Dialog.Title className="text-2xl font-bold mb-2">{game.name}</Dialog.Title>
                  <Dialog.Description className="text-fg-muted mb-4">
                    Dialog tint is scoped to its game wrapper via CSS variables.
                  </Dialog.Description>
                  <Dialog.Close asChild>
                    <Button variant="outline">Close</Button>
                  </Dialog.Close>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Important:** Because Radix portals Dialog.Content to `document.body` by default, the scoped CSS variables on the game wrapper won't reach it. To keep tinting working in this story, portal to a container inside the wrapper:

Update the story to use `Dialog.Portal`'s `container` prop — attach a ref to the wrapper div and pass it. Revised markup:

```tsx
import { useState, useRef } from 'react';
// ...
function GameCard({ game, open, onOpenChange }: {
  game: GameTint;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      style={{
        ['--modal-tint' as string]: game.tint,
        ['--modal-wash' as string]: game.wash,
        ['--modal-wash-2' as string]: game.wash2,
      }}
      className="p-6 rounded-card bg-bg-elevated flex flex-col gap-3 relative"
    >
      <h3 className="font-bold">{game.name}</h3>
      <Button onClick={() => onOpenChange(true)}>Open dialog</Button>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal container={ref.current}>
          <Dialog.Overlay />
          <Dialog.Content variant="backlit">
            <Dialog.Title className="text-2xl font-bold mb-2">{game.name}</Dialog.Title>
            <Dialog.Description className="text-fg-muted mb-4">
              Dialog tint scoped to game wrapper via CSS variables.
            </Dialog.Description>
            <Dialog.Close asChild>
              <Button variant="outline">Close</Button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

export default function TintingStory() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold">Per-game modal tinting</h2>
      <div className="grid grid-cols-2 gap-4">
        {GAMES.map((game, i) => (
          <GameCard
            key={game.name}
            game={game}
            open={openIdx === i}
            onOpenChange={(o) => setOpenIdx(o ? i : null)}
          />
        ))}
      </div>
    </div>
  );
}
```

**Alternative for real app usage:** set tinting vars on `<html>` or the app root instead of a scoped wrapper — then Radix's default document-body portal reads them fine.

- [ ] **Step 2: Register in stories index**

```ts
import type { ComponentType } from 'react';
import ButtonStory from './Button';
import DialogStory from './Dialog';
import TintingStory from './Tinting';

export interface Story { slug: string; label: string; Component: ComponentType; }

export const stories: Story[] = [
  { slug: 'button',   label: 'Button',   Component: ButtonStory },
  { slug: 'dialog',   label: 'Dialog',   Component: DialogStory },
  { slug: 'tinting',  label: 'Tinting',  Component: TintingStory },
];
```

- [ ] **Step 3: Typecheck and visual check**

```bash
npm run typecheck
npm run dev:tv
```
Visit `/ui-preview/tinting`. Open each game's dialog — the halo/wash colors change per game.

- [ ] **Step 4: Commit**

```bash
git add packages/tv/src/preview
git commit -m "Add tinting story demonstrating scoped modal color variables"
```

---

## Task 10: Port `FocusFrame`

**Files:**
- Read: `packages/tv/src/components/FocusFrame.tsx` (existing)
- Create: `packages/ui-weekend/src/tv/FocusFrame.tsx`
- Create: `packages/ui-weekend/src/tv/index.ts`
- Modify: `packages/ui-weekend/src/index.ts`
- Modify: all call-sites of the old `FocusFrame` in `packages/tv/src/` — change import to `@weekend/ui`
- Delete: `packages/tv/src/components/FocusFrame.tsx`
- Create: `packages/tv/src/preview/stories/FocusFrame.tsx`
- Modify: `packages/tv/src/preview/stories/index.ts`

- [ ] **Step 1: Read existing `FocusFrame.tsx`**

```bash
cat packages/tv/src/components/FocusFrame.tsx
```

Capture its API (props) and internal behavior.

- [ ] **Step 2: Find all call sites**

```bash
grep -rn "from.*FocusFrame\|import.*FocusFrame" packages/tv/src
```

Record the list — each will need an import swap in Step 6.

- [ ] **Step 3: Create `packages/ui-weekend/src/tv/FocusFrame.tsx`**

Copy the contents of the existing `FocusFrame.tsx` verbatim to the new location, then:
- Replace any hardcoded `#FFE88B` with `rgb(var(--color-focus))`
- Replace any hardcoded transition timings (e.g., `220ms`) with `var(--duration-base)` and `var(--ease-standard)` where applicable
- Keep the `0.5vw` margin behavior (per CLAUDE.md)
- Export as `FocusFrame`

If the existing file uses inline styles with the hex color, convert:

```tsx
// Before
style={{ border: '2px solid #FFE88B', ... }}
// After
style={{ border: '2px solid rgb(var(--color-focus))', ... }}
```

If it uses Tailwind classes, use `border-focus` from the preset.

- [ ] **Step 4: Create `packages/ui-weekend/src/tv/index.ts`**

```ts
export { FocusFrame } from './FocusFrame';
```

- [ ] **Step 5: Update `packages/ui-weekend/src/index.ts`**

```ts
export * from './tokens/index.js';
export * from './primitives/index.js';
export * from './tv/index.js';
```

- [ ] **Step 6: Swap imports at every call site**

For each file surfaced by Step 2:

```ts
// Before
import { FocusFrame } from './components/FocusFrame';
// or
import { FocusFrame } from '../components/FocusFrame';

// After
import { FocusFrame } from '@weekend/ui';
```

Preserve any local prop shapes — the ported `FocusFrame` has the same API.

- [ ] **Step 7: Delete the old file**

```bash
rm packages/tv/src/components/FocusFrame.tsx
```

- [ ] **Step 8: Create `packages/tv/src/preview/stories/FocusFrame.tsx`**

```tsx
import { useRef, useState, useEffect } from 'react';
import { FocusFrame } from '@weekend/ui';

export default function FocusFrameStory() {
  const tile1 = useRef<HTMLDivElement>(null);
  const tile2 = useRef<HTMLDivElement>(null);
  const tile3 = useRef<HTMLDivElement>(null);
  const tiles = [tile1, tile2, tile3];
  const [focusIdx, setFocusIdx] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setFocusIdx((i) => Math.min(i + 1, tiles.length - 1));
      if (e.key === 'ArrowLeft')  setFocusIdx((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold">FocusFrame</h2>
      <p className="text-fg-muted">Arrow keys cycle focus between tiles.</p>
      <div className="relative flex gap-6">
        {tiles.map((ref, i) => (
          <div
            key={i}
            ref={ref}
            className="w-48 h-32 bg-bg-elevated rounded-card flex items-center justify-center"
          >
            Tile {i + 1}
          </div>
        ))}
        <FocusFrame target={tiles[focusIdx]} visible />
      </div>
    </div>
  );
}
```

**Note:** the exact prop names (`target`, `visible`) must match the ported `FocusFrame`'s API. Adjust after Step 3 if the existing API differs.

- [ ] **Step 9: Register story**

```ts
import FocusFrameStory from './FocusFrame';
// add to array:
{ slug: 'focus-frame', label: 'FocusFrame', Component: FocusFrameStory },
```

- [ ] **Step 10: Typecheck and visual check**

```bash
npm run typecheck
npm run dev:tv
```

Visit `/ui-preview/focus-frame` — 3 tiles with yellow frame around first. Press → arrow → frame animates to next tile. Visit `/` and confirm the real TV UI's focus frame still works.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "Port FocusFrame into @weekend/ui and delete old copy"
```

---

## Task 11: `QRCard`, `RoomCodeDisplay`, `SlotCard`

**Files:**
- Create: `packages/ui-weekend/src/tv/QRCard.tsx`
- Create: `packages/ui-weekend/src/tv/RoomCodeDisplay.tsx`
- Create: `packages/ui-weekend/src/tv/SlotCard.tsx`
- Modify: `packages/ui-weekend/src/tv/index.ts`
- Create: `packages/tv/src/preview/stories/Controllers.tsx`
- Modify: `packages/tv/src/preview/stories/index.ts`

- [ ] **Step 1: Create `packages/ui-weekend/src/tv/QRCard.tsx`**

```tsx
import { QRCodeSVG } from 'qrcode.react';

export interface QRCardProps {
  url: string;
  size?: number;
}

export function QRCard({ url, size = 240 }: QRCardProps) {
  return (
    <div className="bg-white p-4 rounded-card flex flex-col items-center gap-3 text-[rgb(var(--palette-ink-950))]">
      <QRCodeSVG value={url} size={size} level="M" />
      <p className="text-sm font-medium">Scan to join</p>
    </div>
  );
}
```

- [ ] **Step 2: Create `packages/ui-weekend/src/tv/RoomCodeDisplay.tsx`**

```tsx
export interface RoomCodeDisplayProps {
  code: string;
}

export function RoomCodeDisplay({ code }: RoomCodeDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm text-fg-muted uppercase tracking-widest">Room code</p>
      <p
        className="font-bold tabular-nums"
        style={{ fontSize: 'var(--type-code)', letterSpacing: '0.1em' }}
      >
        {code}
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Create `packages/ui-weekend/src/tv/SlotCard.tsx`**

```tsx
import { Check, Loader2 } from 'lucide-react';

export type SlotState = 'waiting' | 'connecting' | 'connected';

export interface Slot {
  id: string;
  state: SlotState;
  name?: string;
  colorHex?: string;
}

export interface SlotCardProps {
  slot: Slot;
}

export function SlotCard({ slot }: SlotCardProps) {
  return (
    <div
      data-state={slot.state}
      className={[
        'relative rounded-card p-4 flex items-center gap-3 transition-[background,border] duration-base',
        'data-[state=waiting]:border-2 data-[state=waiting]:border-dashed data-[state=waiting]:border-fg/30 data-[state=waiting]:bg-transparent data-[state=waiting]:text-fg-muted',
        'data-[state=connecting]:border-2 data-[state=connecting]:border-solid data-[state=connecting]:border-fg/60 data-[state=connecting]:bg-bg-elevated data-[state=connecting]:text-fg data-[state=connecting]:animate-[weekend-slot-pulse_1.2s_ease-in-out_infinite]',
        'data-[state=connected]:bg-bg-elevated data-[state=connected]:text-fg',
      ].join(' ')}
      style={
        slot.state === 'connected' && slot.colorHex
          ? { boxShadow: `inset 0 0 0 2px ${slot.colorHex}` }
          : undefined
      }
    >
      {slot.state === 'waiting' && (
        <span className="text-sm">Open slot</span>
      )}
      {slot.state === 'connecting' && (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Connecting…</span>
        </>
      )}
      {slot.state === 'connected' && (
        <>
          <Check className="w-5 h-5" />
          <span className="font-medium">{slot.name ?? 'Player'}</span>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Update `packages/ui-weekend/src/tv/index.ts`**

```ts
export { FocusFrame } from './FocusFrame';
export { QRCard, type QRCardProps } from './QRCard';
export { RoomCodeDisplay, type RoomCodeDisplayProps } from './RoomCodeDisplay';
export { SlotCard, type SlotCardProps, type Slot, type SlotState } from './SlotCard';
```

- [ ] **Step 5: Create `packages/tv/src/preview/stories/Controllers.tsx`**

```tsx
import { QRCard, RoomCodeDisplay, SlotCard, type Slot } from '@weekend/ui';

const SLOTS: Slot[] = [
  { id: '1', state: 'connected',  name: 'Alex', colorHex: '#FFE88B' },
  { id: '2', state: 'connecting' },
  { id: '3', state: 'waiting' },
  { id: '4', state: 'waiting' },
];

export default function ControllersStory() {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-xl font-bold mb-3">QRCard</h2>
        <QRCard url="https://localhost:5174?code=ABC123" />
      </section>
      <section>
        <h2 className="text-xl font-bold mb-3">RoomCodeDisplay</h2>
        <RoomCodeDisplay code="ABC123" />
      </section>
      <section>
        <h2 className="text-xl font-bold mb-3">SlotCard (all states)</h2>
        <div className="grid grid-cols-2 gap-3 max-w-xl">
          {SLOTS.map((s) => (
            <SlotCard key={s.id} slot={s} />
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 6: Register story**

```ts
// In stories/index.ts, add:
import ControllersStory from './Controllers';
// and append:
{ slug: 'controllers', label: 'Controllers', Component: ControllersStory },
```

- [ ] **Step 7: Typecheck and visual check**

```bash
npm run typecheck
npm run dev:tv
```

Visit `/ui-preview/controllers`:
- White QR panel with "Scan to join" label.
- Room code "ABC123" in huge Weekend Repro Bold.
- 4 slot cards: one connected with yellow inset ring + checkmark + "Alex"; one pulsing with spinner + "Connecting…"; two dashed-outline "Open slot".

- [ ] **Step 8: Commit**

```bash
git add packages/ui-weekend/src packages/tv/src/preview
git commit -m "Add QRCard, RoomCodeDisplay, and SlotCard to @weekend/ui"
```

---

## Task 12: `ControllersPanel`

**Files:**
- Create: `packages/ui-weekend/src/tv/ControllersPanel.tsx`
- Modify: `packages/ui-weekend/src/tv/index.ts`
- Modify: `packages/tv/src/preview/stories/Controllers.tsx` — add composed panel example

- [ ] **Step 1: Create `packages/ui-weekend/src/tv/ControllersPanel.tsx`**

```tsx
import { ArrowLeft } from 'lucide-react';
import { QRCard } from './QRCard';
import { RoomCodeDisplay } from './RoomCodeDisplay';
import { SlotCard, type Slot } from './SlotCard';
import { Button } from '../primitives/Button';

export interface ControllersPanelProps {
  mobileUrl: string;
  roomCode: string;
  slots: Slot[];
  onBack: () => void;
}

export function ControllersPanel({ mobileUrl, roomCode, slots, onBack }: ControllersPanelProps) {
  return (
    <div className="flex flex-col gap-6 w-full">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-2xl font-bold">Controllers</h2>
      </header>
      <div className="grid grid-cols-[auto_1fr] gap-8">
        <div className="flex flex-col gap-4 items-center">
          <QRCard url={mobileUrl} />
          <RoomCodeDisplay code={roomCode} />
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-sm uppercase tracking-widest text-fg-muted">Slots</h3>
          <div className="grid grid-cols-2 gap-3">
            {slots.map((s) => (
              <SlotCard key={s.id} slot={s} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update `packages/ui-weekend/src/tv/index.ts`**

```ts
export { FocusFrame } from './FocusFrame';
export { QRCard, type QRCardProps } from './QRCard';
export { RoomCodeDisplay, type RoomCodeDisplayProps } from './RoomCodeDisplay';
export { SlotCard, type SlotCardProps, type Slot, type SlotState } from './SlotCard';
export { ControllersPanel, type ControllersPanelProps } from './ControllersPanel';
```

- [ ] **Step 3: Add composed example to Controllers story**

Append to `packages/tv/src/preview/stories/Controllers.tsx`:

```tsx
import { ControllersPanel } from '@weekend/ui';
// ... existing exports

function ComposedPanel() {
  return (
    <ControllersPanel
      mobileUrl="https://localhost:5174?code=ABC123"
      roomCode="ABC123"
      slots={SLOTS}
      onBack={() => alert('Back clicked')}
    />
  );
}
```

And add it as a section in the existing default export return:

```tsx
<section>
  <h2 className="text-xl font-bold mb-3">ControllersPanel (composed)</h2>
  <ComposedPanel />
</section>
```

- [ ] **Step 4: Typecheck and visual check**

```bash
npm run typecheck
npm run dev:tv
```

`/ui-preview/controllers` now shows the composed `ControllersPanel` — left column: QR + code, right column: slot grid. Back button logs an alert.

- [ ] **Step 5: Commit**

```bash
git add packages/ui-weekend/src packages/tv/src/preview
git commit -m "Add ControllersPanel composing QR, code, and slot cards"
```

---

## Task 13: `SystemMenuOverlay`

**Files:**
- Create: `packages/ui-weekend/src/tv/SystemMenuOverlay.tsx`
- Modify: `packages/ui-weekend/src/tv/index.ts`
- Create: `packages/tv/src/preview/stories/SystemMenu.tsx`
- Modify: `packages/tv/src/preview/stories/index.ts`

- [ ] **Step 1: Create `packages/ui-weekend/src/tv/SystemMenuOverlay.tsx`**

```tsx
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Gamepad2, X } from 'lucide-react';
import { Dialog } from '../primitives/Dialog';
import { ControllersPanel } from './ControllersPanel';
import type { Slot } from './SlotCard';

export interface SystemMenuOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mobileUrl: string;
  roomCode: string;
  slots: Slot[];
  onResume: () => void;
  onExitGame: () => void;
}

type Panel = 'root' | 'controllers';

interface MenuItem {
  key: string;
  icon: ReactNode;
  label: string;
  onSelect: () => void;
}

export function SystemMenuOverlay({
  open,
  onOpenChange,
  mobileUrl,
  roomCode,
  slots,
  onResume,
  onExitGame,
}: SystemMenuOverlayProps) {
  const [panel, setPanel] = useState<Panel>('root');
  const [focusIdx, setFocusIdx] = useState(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Reset to root when closing
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setPanel('root');
        setFocusIdx(0);
      }, 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  const items: MenuItem[] = [
    { key: 'resume',      icon: <ArrowLeft className="w-8 h-8" />, label: 'Resume',     onSelect: () => { onOpenChange(false); onResume(); } },
    { key: 'controllers', icon: <Gamepad2 className="w-8 h-8" />,  label: 'Controllers',onSelect: () => setPanel('controllers') },
    { key: 'exit',        icon: <X className="w-8 h-8" />,         label: 'Exit Game',  onSelect: () => { onOpenChange(false); onExitGame(); } },
  ];

  // Roving focus on L1
  useEffect(() => {
    if (panel !== 'root' || !open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setFocusIdx((i) => (i + 1) % items.length);
      if (e.key === 'ArrowLeft')  setFocusIdx((i) => (i - 1 + items.length) % items.length);
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        items[focusIdx]?.onSelect();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel, open, focusIdx]);

  useEffect(() => {
    if (panel === 'root') itemRefs.current[focusIdx]?.focus();
  }, [focusIdx, panel]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content variant="backlit">
          <Dialog.Title className="sr-only">System menu</Dialog.Title>
          {panel === 'root' ? (
            <div className="flex gap-6 justify-center py-8">
              {items.map((item, i) => (
                <button
                  key={item.key}
                  ref={(el) => { itemRefs.current[i] = el; }}
                  onClick={item.onSelect}
                  className="flex flex-col items-center gap-3 p-6 rounded-card transition-colors focus:outline-none focus:bg-fg/10 min-w-[160px]"
                >
                  <div className="w-16 h-16 rounded-pill bg-fg/10 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <span className="text-lg font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <ControllersPanel
              mobileUrl={mobileUrl}
              roomCode={roomCode}
              slots={slots}
              onBack={() => setPanel('root')}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

- [ ] **Step 2: Update `packages/ui-weekend/src/tv/index.ts`**

```ts
export { FocusFrame } from './FocusFrame';
export { QRCard, type QRCardProps } from './QRCard';
export { RoomCodeDisplay, type RoomCodeDisplayProps } from './RoomCodeDisplay';
export { SlotCard, type SlotCardProps, type Slot, type SlotState } from './SlotCard';
export { ControllersPanel, type ControllersPanelProps } from './ControllersPanel';
export { SystemMenuOverlay, type SystemMenuOverlayProps } from './SystemMenuOverlay';
```

- [ ] **Step 3: Create `packages/tv/src/preview/stories/SystemMenu.tsx`**

```tsx
import { useState } from 'react';
import { SystemMenuOverlay, Button, type Slot } from '@weekend/ui';

const MOCK_SLOTS: Slot[] = [
  { id: '1', state: 'connected',  name: 'Alex', colorHex: '#FFE88B' },
  { id: '2', state: 'connecting' },
  { id: '3', state: 'waiting' },
];

export default function SystemMenuStory() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold">SystemMenuOverlay</h2>
      <p className="text-fg-muted">
        L1 is three choices (D-pad with ← → or Tab). Pick Controllers to swap to L2.
      </p>
      <Button onClick={() => setOpen(true)}>Open System Menu</Button>
      <SystemMenuOverlay
        open={open}
        onOpenChange={setOpen}
        mobileUrl="https://localhost:5174?code=ABC123"
        roomCode="ABC123"
        slots={MOCK_SLOTS}
        onResume={() => console.log('Resume')}
        onExitGame={() => console.log('Exit')}
      />
    </div>
  );
}
```

- [ ] **Step 4: Register story**

```ts
import SystemMenuStory from './SystemMenu';
// append:
{ slug: 'system-menu', label: 'System Menu', Component: SystemMenuStory },
```

- [ ] **Step 5: Typecheck and visual check**

```bash
npm run typecheck
npm run dev:tv
```

Visit `/ui-preview/system-menu`. Click "Open System Menu". Verify:
- Backlit panel with 3 large tiles.
- ← / → arrow keys move focus between tiles (visible focus ring).
- Enter on "Resume" → closes and logs "Resume".
- Enter on "Controllers" → content swaps to ControllersPanel.
- Back button in Controllers returns to L1.
- Enter on "Exit Game" → closes and logs "Exit".
- ESC closes at any panel.

- [ ] **Step 6: Commit**

```bash
git add packages/ui-weekend/src packages/tv/src/preview
git commit -m "Add SystemMenuOverlay with L1/L2 composition and D-pad focus"
```

---

## Task 14: Socket events — constants + server forwarding

**Files:**
- Modify: `packages/shared/src/constants.ts`
- Modify: `packages/server/src/socket-handler.ts`
- Modify: `packages/shared/src/types.ts` (if present) — add payload types

- [ ] **Step 1: Add socket events to `packages/shared/src/constants.ts`**

Edit the `SOCKET_EVENTS` object to include three new events:

```ts
export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ROOM_CREATE: 'room:create',
  ROOM_CREATED: 'room:created',
  ROOM_JOIN: 'room:join',
  ROOM_JOINED: 'room:joined',
  ROOM_ERROR: 'room:error',
  ROOM_REJOIN: 'room:rejoin',
  ROOM_REJOINED: 'room:rejoined',
  NAVIGATION_INPUT: 'navigation:input',
  NAVIGATION_UPDATE: 'navigation:update',
  SCREEN_UPDATE: 'screen:update',
  SYSTEM_MENU_OPEN: 'system-menu:open',
  SYSTEM_MENU_CLOSE: 'system-menu:close',
  SYSTEM_MENU_ACTION: 'system-menu:action',
} as const;
```

- [ ] **Step 2: Add payload types to `packages/shared/src/types.ts`**

Read existing first: `cat packages/shared/src/types.ts`

Append:

```ts
export interface SystemMenuOpenPayload {
  roomCode: string;
}

export interface SystemMenuClosePayload {
  roomCode: string;
}

export interface SystemMenuActionPayload {
  roomCode: string;
  action: 'resume' | 'exit';
}
```

- [ ] **Step 3: Rebuild shared package**

```bash
npm run build --workspace=packages/shared
```

- [ ] **Step 4: Update `packages/server/src/socket-handler.ts`**

Add handlers after the existing `SCREEN_UPDATE` handler, before the `disconnect` handler. Mobile → TV direction for `SYSTEM_MENU_OPEN` and `SYSTEM_MENU_ACTION`; TV → Mobile for `SYSTEM_MENU_CLOSE`:

```ts
// ... after SCREEN_UPDATE handler

// Mobile → TV: request system menu open
socket.on(SOCKET_EVENTS.SYSTEM_MENU_OPEN, () => {
  const room = roomManager.getRoomBySocket(socket.id);
  if (!room || !room.mobileSocketIds.includes(socket.id)) return;
  if (!room.tvSocketId) return;
  io.to(room.tvSocketId).emit(SOCKET_EVENTS.SYSTEM_MENU_OPEN, { roomCode: room.code });
  console.log(`[Socket] System menu open → TV ${room.tvSocketId}`);
});

// TV → Mobile: menu closed
socket.on(SOCKET_EVENTS.SYSTEM_MENU_CLOSE, () => {
  const room = roomManager.getRoomBySocket(socket.id);
  if (!room || room.tvSocketId !== socket.id) return;
  for (const mobileId of room.mobileSocketIds) {
    io.to(mobileId).emit(SOCKET_EVENTS.SYSTEM_MENU_CLOSE, { roomCode: room.code });
  }
  console.log(`[Socket] System menu close → mobiles in ${room.code}`);
});

// Mobile → TV: menu action (if we ever let phone trigger resume/exit)
socket.on(SOCKET_EVENTS.SYSTEM_MENU_ACTION, (payload: { action: 'resume' | 'exit' }) => {
  const room = roomManager.getRoomBySocket(socket.id);
  if (!room || !room.mobileSocketIds.includes(socket.id)) return;
  if (!room.tvSocketId) return;
  io.to(room.tvSocketId).emit(SOCKET_EVENTS.SYSTEM_MENU_ACTION, { roomCode: room.code, action: payload.action });
  console.log(`[Socket] System menu action ${payload.action} → TV ${room.tvSocketId}`);
});
```

**Note:** The `room` object in this codebase uses `room.code` for the room code (verify in `room-manager.ts`; if the property is named differently, adjust). If `room.code` doesn't exist, check `getRoomBySocket` — it may return an object with a `code` field or use a different name; match the existing pattern.

- [ ] **Step 5: Typecheck and verify server starts**

```bash
npm run typecheck
npm run dev:server
```

Expected: server starts without errors. No action yet — just verifying no regressions.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src packages/shared/dist packages/server/src
git commit -m "Add system-menu socket events and server forwarding"
```

---

## Task 15: Wire TV to listen for `SYSTEM_MENU_OPEN`

**Files:**
- Modify: a TV component that owns system-menu state (likely `App.tsx` or wherever `GameHub`/game screens live)

This task integrates `SystemMenuOverlay` into the real TV UI so the socket event actually opens it.

- [ ] **Step 1: Find the right place to mount `SystemMenuOverlay`**

```bash
grep -rn "useSocket\|socket.on\|io(" packages/tv/src --include="*.tsx"
```

Identify the top-level component that holds the socket reference and room code (likely `App.tsx` or a `useSocket` hook consumer).

- [ ] **Step 2: Mount `SystemMenuOverlay` in the TV's main UI**

In the component that renders the main TV content (e.g., `App.tsx` after router split, or `GameHub`), add state and effect:

```tsx
import { useEffect, useState } from 'react';
import { SystemMenuOverlay, type Slot } from '@weekend/ui';
import { SOCKET_EVENTS } from '@mobile-app-lab/shared';
// ... existing socket/room imports

// Inside the component:
const [systemMenuOpen, setSystemMenuOpen] = useState(false);
// mockSlots for now — will be wired to real party state in PU&P M2
const mockSlots: Slot[] = [
  { id: '1', state: 'waiting' },
  { id: '2', state: 'waiting' },
  { id: '3', state: 'waiting' },
  { id: '4', state: 'waiting' },
];

useEffect(() => {
  if (!socket) return;
  const handleOpen = () => setSystemMenuOpen(true);
  const handleAction = (payload: { action: 'resume' | 'exit' }) => {
    if (payload.action === 'resume') setSystemMenuOpen(false);
    // 'exit' behavior: TBD in PU&P — no-op for now
  };
  socket.on(SOCKET_EVENTS.SYSTEM_MENU_OPEN, handleOpen);
  socket.on(SOCKET_EVENTS.SYSTEM_MENU_ACTION, handleAction);
  return () => {
    socket.off(SOCKET_EVENTS.SYSTEM_MENU_OPEN, handleOpen);
    socket.off(SOCKET_EVENTS.SYSTEM_MENU_ACTION, handleAction);
  };
}, [socket]);

// When user closes the menu, emit close back to mobiles
const handleMenuOpenChange = (next: boolean) => {
  setSystemMenuOpen(next);
  if (!next && socket) socket.emit(SOCKET_EVENTS.SYSTEM_MENU_CLOSE);
};
```

Then mount at the end of the JSX tree (inside the main route, not inside `PreviewShell`):

```tsx
<SystemMenuOverlay
  open={systemMenuOpen}
  onOpenChange={handleMenuOpenChange}
  mobileUrl={/* existing mobileUrl var */}
  roomCode={/* existing roomCode state */}
  slots={mockSlots}
  onResume={() => handleMenuOpenChange(false)}
  onExitGame={() => handleMenuOpenChange(false)}
/>
```

- [ ] **Step 3: Typecheck and run TV**

```bash
npm run typecheck
npm run dev:tv
```

Expected: TV UI renders as before; system menu overlay exists but stays closed (no trigger yet — that comes in Task 17).

- [ ] **Step 4: Commit**

```bash
git add packages/tv/src
git commit -m "Mount SystemMenuOverlay on TV and wire to system-menu socket events"
```

---

## Task 16: `SystemButton` component

**Files:**
- Create: `packages/ui-weekend/src/mobile/SystemButton.tsx`
- Create: `packages/ui-weekend/src/mobile/index.ts`
- Modify: `packages/ui-weekend/src/index.ts`
- Create: `packages/mobile/src/preview/stories/SystemButton.tsx`
- Modify: `packages/mobile/src/preview/stories/index.ts`

- [ ] **Step 1: Create `packages/ui-weekend/src/mobile/SystemButton.tsx`**

```tsx
import { forwardRef, type ReactNode } from 'react';

export interface SystemButtonProps {
  variant: 'hub' | 'game';
  gameLogo?: ReactNode;
  onPress: () => void;
  'aria-label'?: string;
}

export const SystemButton = forwardRef<HTMLButtonElement, SystemButtonProps>(
  ({ variant, gameLogo, onPress, 'aria-label': ariaLabel }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={ariaLabel ?? (variant === 'hub' ? 'Weekend menu' : 'Game menu')}
        onClick={onPress}
        className={[
          'w-[44px] h-[44px] rounded-pill flex items-center justify-center',
          'bg-transparent border-none text-fg',
          'transition-[transform,box-shadow] duration-fast active:scale-90',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          'hover:shadow-cta-glow',
        ].join(' ')}
      >
        {variant === 'hub' ? <WeekendMark /> : gameLogo}
      </button>
    );
  },
);
SystemButton.displayName = 'SystemButton';

// Flat "W" Weekend mark (inline SVG so package is self-contained)
function WeekendMark() {
  return (
    <svg width="28" height="22" viewBox="0 0 28 22" aria-hidden="true">
      <path
        d="M1 1L7.5 20L14 5L20.5 20L27 1"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
```

**Note:** If the repo has an existing authoritative "Weekend W" SVG (e.g., in `packages/mobile/src/components/IconSystem.tsx` or similar), prefer re-exporting / copying that markup. Check via `cat packages/mobile/src/components/IconSystem.tsx` and use its paths here.

- [ ] **Step 2: Create `packages/ui-weekend/src/mobile/index.ts`**

```ts
export { SystemButton, type SystemButtonProps } from './SystemButton';
```

- [ ] **Step 3: Update `packages/ui-weekend/src/index.ts`**

```ts
export * from './tokens/index.js';
export * from './primitives/index.js';
export * from './tv/index.js';
export * from './mobile/index.js';
```

- [ ] **Step 4: Create `packages/mobile/src/preview/stories/SystemButton.tsx`**

```tsx
import { SystemButton } from '@weekend/ui';

export default function SystemButtonStory() {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-lg font-bold mb-2">Hub variant (W)</h2>
        <SystemButton variant="hub" onPress={() => alert('Hub system pressed')} />
      </section>
      <section>
        <h2 className="text-lg font-bold mb-2">Game variant</h2>
        <SystemButton
          variant="game"
          gameLogo={<span className="text-2xl font-bold">SQ</span>}
          onPress={() => alert('Game system pressed')}
        />
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Register story**

```ts
// In packages/mobile/src/preview/stories/index.ts:
import SystemButtonStory from './SystemButton';
// append:
{ slug: 'system-button', label: 'System Button', Component: SystemButtonStory },
```

- [ ] **Step 6: Typecheck and visual check**

```bash
npm run typecheck
npm run dev:mobile
```

Visit `/ui-preview/system-button`. Tap hub variant → alert. Tap game variant → alert. Focus-visible shows yellow ring.

- [ ] **Step 7: Commit**

```bash
git add packages/ui-weekend/src packages/mobile/src/preview
git commit -m "Add SystemButton component to @weekend/ui"
```

---

## Task 17: Integrate `SystemButton` into mobile `TopBar`

**Files:**
- Modify: `packages/mobile/src/components/TopBar.tsx` — swap the middle `TopBarButton` for `SystemButton`
- Modify: wherever `TopBar`'s `onSystem` is wired — ensure it emits the socket event

- [ ] **Step 1: Find where `TopBar` is rendered and who passes `onSystem`**

```bash
grep -rn "TopBar\|onSystem" packages/mobile/src --include="*.tsx"
```

Identify the file that renders `<TopBar onSystem={...} />` and what `onSystem` currently does.

- [ ] **Step 2: Update `packages/mobile/src/components/TopBar.tsx`**

Replace the middle "System button" block (lines 140–154 in current file — the `TopBarButton` that wraps `<IconSystem size={56} />`) with the new `SystemButton`. Keep Back and Settings buttons unchanged:

```tsx
import { useState } from 'react';
import { SystemButton } from '@weekend/ui';
import { HapticFeedback } from '../utils/haptics';

interface TopBarProps {
  onBack: () => void;
  onSystem?: () => void;
  onSettings?: () => void;
}

const buttonStyle: React.CSSProperties = {
  width: '48px',
  height: '48px',
  borderRadius: '7999.2px',
  border: '1.6px solid #000',
  background: 'linear-gradient(0deg, #313149 0%, #313149 100%), #110F0D',
  boxShadow: '1px 2px 2px 0 #888 inset, 0 0 4px 0 rgba(0, 0, 0, 0.50), -1px -2px 2px 0 #1A1A1A inset',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
  transition: 'transform 150ms ease-out',
  overflow: 'visible',
  position: 'relative' as const,
};

function TopBarButton({
  style,
  onPress,
  fireOnRelease,
  children,
}: {
  style?: React.CSSProperties;
  onPress: () => void;
  fireOnRelease?: boolean;
  children: React.ReactNode;
}) {
  const [pressed, setPressed] = useState(false);
  const [ripple, setRipple] = useState(false);

  const triggerRipple = () => {
    setRipple(true);
    setTimeout(() => setRipple(false), 400);
  };

  return (
    <button
      style={{
        ...buttonStyle,
        ...style,
        pointerEvents: 'auto',
        ...(pressed ? { transform: 'scale(0.90)' } : {}),
      }}
      onTouchStart={(e) => {
        e.preventDefault();
        setPressed(true);
        HapticFeedback.light();
        if (!fireOnRelease) {
          onPress();
          triggerRipple();
          setTimeout(() => setPressed(false), 150);
        }
      }}
      onTouchEnd={() => {
        if (fireOnRelease && pressed) {
          onPress();
          triggerRipple();
        }
        setPressed(false);
      }}
      onTouchCancel={() => setPressed(false)}
      onClick={() => {
        if (!fireOnRelease) {
          onPress();
          triggerRipple();
        }
      }}
    >
      {children}
      {ripple && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.25)',
              animation: 'topbar-ripple 400ms ease-out forwards',
            }}
          />
        </div>
      )}
      <style>{`
        @keyframes topbar-ripple {
          0% { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </button>
  );
}

export function TopBar({ onBack, onSystem, onSettings }: TopBarProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9998,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '40px',
        paddingTop: 'max(env(safe-area-inset-top, 12px), 12px)',
        paddingBottom: '8px',
        pointerEvents: 'none',
      }}
    >
      {/* Back button */}
      <TopBarButton onPress={onBack}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M7.5 11L3 6.5L7.5 2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 6.5H14.5C18.09 6.5 21 9.41 21 13C21 16.59 18.09 19.5 14.5 19.5H10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </TopBarButton>

      {/* System button — now from @weekend/ui */}
      <div style={{ pointerEvents: 'auto' }}>
        <SystemButton variant="hub" onPress={() => onSystem?.()} />
      </div>

      {/* Settings button */}
      <TopBarButton onPress={() => onSettings?.()} fireOnRelease>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="1.8" />
        </svg>
      </TopBarButton>
    </div>
  );
}
```

**Important:** The old middle button used 56×56 with `IconSystem`. The new `SystemButton` is 44×44 (design-system size) and renders the flat W mark internally. If a 56px center button is a hard brand requirement, make the `SystemButton` size configurable via a prop (`size?: number`) before using it here.

- [ ] **Step 3: Wire `onSystem` to emit the socket event**

Find the consumer (from Step 1). In that component, add/modify:

```tsx
import { SOCKET_EVENTS } from '@mobile-app-lab/shared';
// wherever socket ref lives:
const handleSystem = () => {
  socket?.emit(SOCKET_EVENTS.SYSTEM_MENU_OPEN);
};

<TopBar onBack={…} onSystem={handleSystem} onSettings={…} />
```

Also subscribe to `SYSTEM_MENU_CLOSE` if you want mobile to display a "menu open" indicator:

```tsx
const [menuOpenOnTv, setMenuOpenOnTv] = useState(false);
useEffect(() => {
  if (!socket) return;
  const onClose = () => setMenuOpenOnTv(false);
  socket.on(SOCKET_EVENTS.SYSTEM_MENU_CLOSE, onClose);
  return () => { socket.off(SOCKET_EVENTS.SYSTEM_MENU_CLOSE, onClose); };
}, [socket]);

const handleSystem = () => {
  socket?.emit(SOCKET_EVENTS.SYSTEM_MENU_OPEN);
  setMenuOpenOnTv(true);
};
```

The "menu open" indicator UI is out of scope here — just track the state.

- [ ] **Step 4: Typecheck and visual check**

```bash
npm run typecheck
npm run dev:mobile
```

Visit https://localhost:5174/. Confirm top bar still shows 3 buttons: Back, new W SystemButton (may look different — verify it's visually acceptable), Settings. Tap System — should emit (check browser devtools Network/WS panel).

- [ ] **Step 5: Commit**

```bash
git add packages/mobile/src
git commit -m "Swap TopBar middle button for @weekend/ui SystemButton and emit system-menu open"
```

---

## Task 18: End-to-end smoke test

**Files:** None modified. This is a manual verification task.

- [ ] **Step 1: Start all services**

```bash
npm run dev
```

Wait until server, TV, and mobile all log ready.

- [ ] **Step 2: Open TV**

Browser: https://localhost:5173/
Verify: room code appears on screen.

- [ ] **Step 3: Open mobile**

On phone (or second browser): https://YOUR_IP:5174/ (or localhost for same-machine browser test)
Pair using the 6-digit room code.

- [ ] **Step 4: Trigger system menu from phone**

Tap the Weekend W in the top bar.
Expected:
- Server log shows `[Socket] System menu open → TV <id>`.
- TV shows the `SystemMenuOverlay` with backlit panel and three tiles (Resume, Controllers, Exit Game).
- Four placeholder slot cards appear in the Controllers panel when selected.

- [ ] **Step 5: Navigate the menu on TV**

Use TV keyboard: ← → to move focus between tiles.
Press Enter on Controllers → panel swaps to `ControllersPanel` with QR + code + 4 waiting slots.
Press Back on TV (click or Escape) → back to L1.

- [ ] **Step 6: Close menu**

Press Enter on Resume (or Escape).
Expected:
- TV menu closes.
- Server log shows `[Socket] System menu close → mobiles in <code>`.
- (Any mobile "menu open" indicator clears, if implemented.)

- [ ] **Step 7: Run full typecheck one last time**

```bash
npm run typecheck
```

Expected: passes across all workspaces.

- [ ] **Step 8: Final commit (if anything straggled)**

```bash
git status
# If nothing: skip. Otherwise commit any fixup.
```

- [ ] **Step 9: Record completion**

Note in project memory or a follow-up doc that v1 of `@weekend/ui` is shipped and ready for PU&P M2 components to start landing on top of it.

---

## Self-review notes

**Spec coverage:**

- Tokens (spec §4) → Task 2 ✓
- Button / Dialog primitives (spec §5) → Tasks 7, 8, 9 ✓
- FocusFrame (spec §6) → Task 10 ✓
- SystemMenuOverlay L1 + L2 (spec §6) → Task 13 ✓
- ControllersPanel (spec §6) → Task 12 ✓
- QRCard / RoomCodeDisplay / SlotCard (spec §6) → Task 11 ✓
- SystemButton (spec §7) → Task 16 ✓
- Socket contract (spec §7) → Task 14 ✓
- TV integration + mobile integration → Tasks 15, 17 ✓
- Dev preview routes (spec §8) → Tasks 5, 6 (+ stories added per component task) ✓
- Port migration (spec §9) → Tasks 3, 4, 10, 17 ✓
- Acceptance criteria §11 → Task 18 ✓

**Known trade-offs/open items:**

1. Radix's default portal puts Dialog content on `document.body`, which sits outside any scoped CSS variable wrapper. Task 9 documents a workaround (`Dialog.Portal container={ref.current}`) for the tinting story. For production usage, set tint vars on `<html>` or the app root so portaled content picks them up; scope per-game by toggling vars on `<html>` when entering/leaving a game.

2. `SystemButton` is 44×44 per design system; existing `TopBar` middle button was 56×56. Task 17 notes this — if 56px is a hard brand requirement, add a `size` prop to `SystemButton` before landing.

3. Task 15 uses mock slot data (`mockSlots: Slot[]` all waiting) because real party/slot domain types don't arrive until PU&P M2. The wiring stays the same — just swap `mockSlots` for live party state later.

4. No test framework is introduced. Verification per task = `npm run typecheck` + preview route visual check. Task 18 is the only end-to-end runtime check.
