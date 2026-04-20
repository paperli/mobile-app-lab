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
