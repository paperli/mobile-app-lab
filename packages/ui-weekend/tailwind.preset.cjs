/** @type {import('tailwindcss').Config} */

// Helper — build a color entry that also resolves to its 500 stop when used
// bare (e.g. `bg-canary` = `bg-canary-500`).
const withDefault = (ramp, defaultStop = 500) => ({
  ...ramp,
  DEFAULT: ramp[defaultStop],
});

const canary = withDefault({
  100: 'rgb(var(--palette-canary-100) / <alpha-value>)',
  200: 'rgb(var(--palette-canary-200) / <alpha-value>)',
  300: 'rgb(var(--palette-canary-300) / <alpha-value>)',
  400: 'rgb(var(--palette-canary-400) / <alpha-value>)',
  500: 'rgb(var(--palette-canary-500) / <alpha-value>)',
  600: 'rgb(var(--palette-canary-600) / <alpha-value>)',
  700: 'rgb(var(--palette-canary-700) / <alpha-value>)',
  800: 'rgb(var(--palette-canary-800) / <alpha-value>)',
  900: 'rgb(var(--palette-canary-900) / <alpha-value>)',
});

// Accent ramp factory — each accent exposes 300/500/700 plus DEFAULT = 500.
const accentRamp = (name) =>
  withDefault({
    300: `rgb(var(--palette-${name}-300) / <alpha-value>)`,
    500: `rgb(var(--palette-${name}-500) / <alpha-value>)`,
    700: `rgb(var(--palette-${name}-700) / <alpha-value>)`,
  });

module.exports = {
  theme: {
    extend: {
      colors: {
        /* Semantic tokens (drive from CSS variables — swap themes without rebuilding) */
        bg:            'rgb(var(--color-bg) / <alpha-value>)',
        'bg-elevated': 'rgb(var(--color-bg-elevated) / <alpha-value>)',
        'bg-midnight': 'rgb(var(--color-bg-midnight) / <alpha-value>)',
        // `fg` resolves to warm-white; the numeric variants below let you
        // write hyphen-only utilities (e.g. `bg-fg-10`, `text-fg-80`,
        // `border-fg-20`) instead of Tailwind's `/` opacity syntax.
        fg: {
          DEFAULT: 'rgb(var(--color-fg) / <alpha-value>)',
          5:  'rgb(var(--color-fg) / 0.05)',
          10: 'rgb(var(--color-fg) / 0.10)',
          15: 'rgb(var(--color-fg) / 0.15)',
          20: 'rgb(var(--color-fg) / 0.20)',
          25: 'rgb(var(--color-fg) / 0.25)',
          60: 'rgb(var(--color-fg) / 0.60)',
          80: 'rgb(var(--color-fg) / 0.80)',
          90: 'rgb(var(--color-fg) / 0.90)',
        },
        'fg-muted':    'rgb(var(--color-fg-muted) / <alpha-value>)',
        brand:         'rgb(var(--color-brand) / <alpha-value>)',
        action:        'rgb(var(--color-action) / <alpha-value>)',
        focus:         'rgb(var(--color-focus) / <alpha-value>)',

        /* Brand palette */
        canary,
        clementine: accentRamp('clementine'),
        raspberry:  accentRamp('raspberry'),
        orchid:     accentRamp('orchid'),
        pink:       accentRamp('pink'),
        sky:        accentRamp('sky'),
        cobalt:     accentRamp('cobalt'),
        hunter:     accentRamp('hunter'),
        limon:      accentRamp('limon'),

        /* Neutrals */
        'warm-white':   'rgb(var(--palette-warm-white) / <alpha-value>)',
        'warmer-white': 'rgb(var(--palette-warmer-white) / <alpha-value>)',
        midnight:       'rgb(var(--palette-midnight-blue) / <alpha-value>)',
        'midnight-lifted': 'rgb(var(--palette-midnight-blue-lifted) / <alpha-value>)',
      },
      fontFamily: {
        sans: 'var(--font-sans)',
        code: 'var(--font-code)',
      },
      // Weekend type scale — semantic size/line-height pairs.
      // Utilities: text-display-1 … text-display-6, text-title, text-body,
      // text-callout, text-hint, text-metadata, text-caption.
      // Default Tailwind sizes (text-xs, text-sm, etc.) are still available
      // for incidental UI that hasn't migrated to the semantic scale yet.
      fontSize: {
        'display-1': ['96px', { lineHeight: '104px' }],
        'display-2': ['80px', { lineHeight: '88px' }],
        'display-3': ['64px', { lineHeight: '72px' }],
        'display-4': ['56px', { lineHeight: '64px' }],
        'display-5': ['48px', { lineHeight: '56px' }],
        'display-6': ['40px', { lineHeight: '48px' }],
        title:    ['40px', { lineHeight: '48px' }],
        body:     ['32px', { lineHeight: '48px' }],
        callout:  ['32px', { lineHeight: '40px' }],
        hint:     ['32px', { lineHeight: '44px' }],
        metadata: ['24px', { lineHeight: '32px' }],
        caption:  ['24px', { lineHeight: '32px' }],
      },
      spacing: {
        // Primitive 8px scale (in addition to Tailwind's default keys).
        'space-1': 'var(--space-1)',
        'space-2': 'var(--space-2)',
        'space-3': 'var(--space-3)',
        'space-4': 'var(--space-4)',
        'space-5': 'var(--space-5)',
        'space-6': 'var(--space-6)',
        'space-7': 'var(--space-7)',
        'space-8': 'var(--space-8)',
        'space-9': 'var(--space-9)',
        'space-10': 'var(--space-10)',
        'space-11': 'var(--space-11)',
        'space-12': 'var(--space-12)',
        // Semantic hub-layout tokens (drive gap-/p-/w- utilities).
        'shelf-gutter': 'var(--shelf-gutter)',
        'shelf-gap': 'var(--shelf-gap)',
        'shelf-header': 'var(--shelf-header-gap)',
        'shelf-row': 'var(--shelf-row-gap)',
        'shelf-fade': 'var(--shelf-fade)',
        tile: 'var(--tile-w)',
        'tile-featured': 'var(--tile-w-featured)',
      },
      borderRadius: {
        pill: 'var(--radius-pill)',
        card: 'var(--radius-card)',
        tile: 'var(--tile-radius)',
      },
      aspectRatio: {
        tile: '16 / 9',
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
