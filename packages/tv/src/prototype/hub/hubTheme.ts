// ─────────────────────────────────────────────────────────────────────────
//  Hub theme — one shared component tree, two looks.
//
//  The hub UI (GameHub + HeroSlide / PreviewHero / Tile / GameMetaPills / brand
//  mark) is rendered in one of two themes, provided via context so components
//  read it without prop-drilling:
//
//    · arcade — the production Weekend DS: Midnight-Blue surfaces, Canary
//               actions/focus, the real brand logo + exported game art, and the
//               DS metadata pills. Full color.
//    · mockup — the low-fidelity exploration look: the whole stage is rendered
//               grayscale, with the plain "weekend" text wordmark, emoji-glyph
//               pills, and a simple white focus ring.
//
//  Exact surface colors (bg/ink) are intentionally NOT themed here: the mockup
//  theme desaturates the entire stage via `grayscale`, so those literals read as
//  neutral greys regardless. The theme only carries the *treatment* choices that
//  survive grayscale (brand mark, pill style, accent/focus treatment).
// ─────────────────────────────────────────────────────────────────────────
import { createContext, useContext } from 'react';

export type HubThemeName = 'arcade' | 'mockup';

export interface HubTheme {
  name: HubThemeName;
  /** Render the whole stage grayscale (the low-fi mockup guarantee). */
  grayscale: boolean;
  /** Brand wordmark: the real Canary logo asset (true) vs plain "weekend" text. */
  brandLogo: boolean;
  /** Metadata pills: DS frosted pill + Canary icon (true) vs emoji-glyph chip. */
  dsPills: boolean;
  /** Accent treatment — Canary CTA, Canary gradient focus ring + gap, Canary
   *  carousel dot (true) vs the original white/dark treatment. */
  dsAccent: boolean;
  /** Metadata-pill height for this theme (the DS chip's other metrics are fixed). */
  pillSize: number;
}

export const ARCADE_THEME: HubTheme = {
  name: 'arcade',
  grayscale: false,
  brandLogo: true,
  dsPills: true,
  dsAccent: true,
  pillSize: 52,
};

export const MOCKUP_THEME: HubTheme = {
  name: 'mockup',
  grayscale: true,
  brandLogo: false,
  dsPills: false,
  dsAccent: false,
  pillSize: 40,
};

// Default to the low-fi mockup theme so any consumer rendered outside a provider
// (e.g. the Component Kit, HeroV2, gallery stories) keeps the original look.
export const HubThemeContext = createContext<HubTheme>(MOCKUP_THEME);

export const useHubTheme = (): HubTheme => useContext(HubThemeContext);
