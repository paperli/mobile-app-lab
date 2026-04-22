/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('@weekend/ui/tailwind.preset')],
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
    '../ui-weekend/src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
