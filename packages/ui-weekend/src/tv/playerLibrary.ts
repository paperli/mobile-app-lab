export interface Player {
  id: string;
  name: string;
  colorHex: string;
}

// Prototype player profiles — used to hydrate connected slots before real
// party/slot state lands with PU&P M2.
export const WEEKEND_PLAYERS: Player[] = [
  { id: 'alex',    name: 'Alex',    colorHex: '#FFE88B' },
  { id: 'morgan',  name: 'Morgan',  colorHex: '#5E83FD' },
  { id: 'sam',     name: 'Sam',     colorHex: '#FF6B6B' },
  { id: 'jordan',  name: 'Jordan',  colorHex: '#4ECDC4' },
  { id: 'riley',   name: 'Riley',   colorHex: '#FFA07A' },
  { id: 'casey',   name: 'Casey',   colorHex: '#8B5CF6' },
];

export function getPlayerByIndex(index: number): Player {
  return WEEKEND_PLAYERS[index % WEEKEND_PLAYERS.length];
}

export function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}
