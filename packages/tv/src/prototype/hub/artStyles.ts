// ─────────────────────────────────────────────────────────────────────────
//  Theme → CSS art helpers
//
//  Turns a GameTheme into layered CSS backgrounds so every game gets a
//  distinct, intentional-looking stylized "hero image" / "tile art" without
//  any raster assets. Layers, front → back:
//     1. pattern motif (accent, low alpha)
//     2. brand gradient (from → to, focal toward the right for heroes)
//     3. base fill
// ─────────────────────────────────────────────────────────────────────────
import type { CSSProperties } from 'react';
import type { GameTheme, PatternKind } from './games';

/** Hex (#rrggbb) → rgba() string. */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface Layers {
  image: string[];
  size: string[];
  position: string[];
  repeat: string[];
}

/** Build the pattern overlay layer(s) for a theme. */
function patternLayers(pattern: PatternKind, theme: GameTheme): Layers {
  const a = theme.accent;
  const ink = theme.ink ?? '#ffffff';
  const line = theme.light ? hexToRgba(ink, 0.12) : hexToRgba(a, 0.16);
  const soft = theme.light ? hexToRgba(ink, 0.08) : hexToRgba('#ffffff', 0.06);

  switch (pattern) {
    case 'rays':
      return {
        image: [`repeating-conic-gradient(from 200deg at 80% 118%, ${hexToRgba(a, 0.14)} 0deg 5deg, transparent 5deg 15deg)`],
        size: ['100% 100%'],
        position: ['center'],
        repeat: ['no-repeat'],
      };
    case 'bars':
      return {
        image: [`repeating-linear-gradient(90deg, ${hexToRgba(a, 0.22)} 0 10px, transparent 10px 30px)`],
        size: ['100% 62%'],
        position: ['bottom'],
        repeat: ['repeat-x'],
      };
    case 'grid':
      return {
        image: [
          `linear-gradient(${line} 1.5px, transparent 1.5px)`,
          `linear-gradient(90deg, ${line} 1.5px, transparent 1.5px)`,
        ],
        size: ['64px 64px', '64px 64px'],
        position: ['center', 'center'],
        repeat: ['repeat', 'repeat'],
      };
    case 'dots':
      return {
        image: [`radial-gradient(${hexToRgba(a, 0.35)} 4px, transparent 5px)`],
        size: ['46px 46px'],
        position: ['center'],
        repeat: ['repeat'],
      };
    case 'confetti':
      return {
        image: [
          `radial-gradient(circle at 12% 22%, ${hexToRgba(a, 0.5)} 0 6px, transparent 7px)`,
          `radial-gradient(circle at 32% 68%, ${hexToRgba('#ffffff', 0.4)} 0 5px, transparent 6px)`,
          `radial-gradient(circle at 58% 18%, ${hexToRgba(a, 0.4)} 0 7px, transparent 8px)`,
          `radial-gradient(circle at 74% 74%, ${hexToRgba('#ffffff', 0.35)} 0 5px, transparent 6px)`,
          `radial-gradient(circle at 88% 40%, ${hexToRgba(a, 0.45)} 0 6px, transparent 7px)`,
          `radial-gradient(circle at 46% 44%, ${hexToRgba('#ffffff', 0.3)} 0 4px, transparent 5px)`,
        ],
        size: ['100% 100%', '100% 100%', '100% 100%', '100% 100%', '100% 100%', '100% 100%'],
        position: ['center', 'center', 'center', 'center', 'center', 'center'],
        repeat: ['no-repeat', 'no-repeat', 'no-repeat', 'no-repeat', 'no-repeat', 'no-repeat'],
      };
    case 'waves':
      return {
        image: [`repeating-radial-gradient(circle at 80% 45%, ${hexToRgba(a, 0.16)} 0 2px, transparent 2px 34px)`],
        size: ['140% 140%'],
        position: ['center'],
        repeat: ['no-repeat'],
      };
    case 'stripes':
      return {
        image: [`repeating-linear-gradient(135deg, ${hexToRgba(a, 0.16)} 0 16px, transparent 16px 44px)`],
        size: ['100% 100%'],
        position: ['center'],
        repeat: ['repeat'],
      };
    case 'sketch':
      return {
        image: [
          `linear-gradient(${line} 1px, transparent 1px)`,
          `linear-gradient(90deg, ${line} 1px, transparent 1px)`,
          `radial-gradient(circle at 82% 60%, ${soft} 0 60px, transparent 61px)`,
        ],
        size: ['30px 30px', '30px 30px', '100% 100%'],
        position: ['center', 'center', 'center'],
        repeat: ['repeat', 'repeat', 'no-repeat'],
      };
    case 'hex':
      return {
        image: [
          `repeating-linear-gradient(60deg, ${line} 0 1px, transparent 1px 22px)`,
          `repeating-linear-gradient(-60deg, ${line} 0 1px, transparent 1px 22px)`,
        ],
        size: ['100% 100%', '100% 100%'],
        position: ['center', 'center'],
        repeat: ['repeat', 'repeat'],
      };
  }
}

/** Brand gradient, focal weighted toward the right (hero focal subject rule). */
function heroGradient(theme: GameTheme): string {
  return `radial-gradient(125% 150% at 76% 38%, ${hexToRgba(theme.to, 0.95)} 0%, ${hexToRgba(theme.from, 0.9)} 46%, ${theme.base} 100%)`;
}

/** Balanced diagonal gradient for tiles / small surfaces. */
function tileGradient(theme: GameTheme): string {
  return `linear-gradient(135deg, ${theme.from} 0%, ${theme.to} 100%)`;
}

function compose(gradient: string, layers: Layers, base: string): CSSProperties {
  return {
    backgroundColor: base,
    backgroundImage: [...layers.image, gradient].join(', '),
    backgroundSize: [...layers.size, 'cover'].join(', '),
    backgroundPosition: [...layers.position, 'center'].join(', '),
    backgroundRepeat: [...layers.repeat, 'no-repeat'].join(', '),
  };
}

/** Full-bleed hero art background (1920×800 band). */
export function heroBackground(theme: GameTheme): CSSProperties {
  return compose(heroGradient(theme), patternLayers(theme.pattern, theme), theme.base);
}

/** Tile art background (16:9). */
export function tileBackground(theme: GameTheme): CSSProperties {
  return compose(tileGradient(theme), patternLayers(theme.pattern, theme), theme.base);
}

/** Flat themed surface for screenshot chrome (no motif focal). */
export function plainBackground(theme: GameTheme): CSSProperties {
  return {
    backgroundColor: theme.base,
    backgroundImage: `linear-gradient(160deg, ${hexToRgba(theme.from, 0.9)} 0%, ${theme.base} 100%)`,
  };
}
