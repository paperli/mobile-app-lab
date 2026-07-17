// Shared visual tokens for the personalization simulator.
// Categorical hues come from the validated dark-surface palette (see the
// dataviz reference); genre colors are a fixed, entity-stable assignment.

import type { Genre } from '../personalization';

export const FONT = "'Weekend Repro', ui-sans-serif, system-ui, sans-serif";

export const UI = {
  page: '#08090a',
  card: '#141518',
  cardAlt: '#0f1013',
  border: '#26272b',
  borderStrong: '#3a3b40',
  ink: '#f3f4f1',
  ink70: 'rgba(243,244,241,0.7)',
  ink50: 'rgba(243,244,241,0.5)',
  muted: '#8a8a9a',
  grid: '#2c2c2a',
  accent: '#3987e5',
  good: '#3fb56b',
  bad: '#e66767',
};

// Entity-stable genre palette. Never cycled; assigned once.
export const GENRE_COLOR: Record<Genre, string> = {
  Trivia: '#3987e5', // blue
  Music: '#d55181', // magenta
  Word: '#199e70', // aqua
  Party: '#d95926', // orange
  Puzzle: '#9085e9', // violet
  Action: '#e66767', // red
  Kids: '#3fb56b', // green
  Strategy: '#c98500', // yellow
};

// Evidence-scope badge colors (matches the "job" coloring used elsewhere).
export const SCOPE_COLOR: Record<string, string> = {
  PROFILE: '#c58cf5',
  HOUSEHOLD: '#5aa9ff',
  PARTY: '#f4b740',
  GAME: '#5ad19b',
  CONTEXTUAL: '#5aa9ff',
  EDITORIAL: '#f4b740',
  NEUTRAL: '#8a8a9a',
};
