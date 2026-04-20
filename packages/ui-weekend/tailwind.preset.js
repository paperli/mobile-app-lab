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
