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
