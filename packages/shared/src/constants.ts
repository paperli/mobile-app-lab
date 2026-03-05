// Socket.io event names
export const SOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',

  // Room events
  ROOM_CREATE: 'room:create',
  ROOM_CREATED: 'room:created',
  ROOM_JOIN: 'room:join',
  ROOM_JOINED: 'room:joined',
  ROOM_ERROR: 'room:error',

  // Navigation events
  NAVIGATION_INPUT: 'navigation:input',
  NAVIGATION_UPDATE: 'navigation:update',
} as const;

// Configuration
export const CONFIG = {
  ROOM_CODE_LENGTH: 6,
  SERVER_PORT: 3000,
  TV_PORT: 5173,
  MOBILE_PORT: 5174,
  ROOM_EXPIRY_MS: 3600000, // 1 hour
} as const;

// Game data (placeholder)
export const PLACEHOLDER_GAMES = [
  {
    id: 'game-1',
    title: 'Song Quiz',
    description: 'Guess the song from short clips',
    previewImage: '/placeholder-racing.jpg',
    backgroundColor: '#FF6B6B',
  },
  {
    id: 'game-2',
    title: 'Puzzle Quest',
    description: 'Mind-bending puzzles',
    previewImage: '/placeholder-puzzle.jpg',
    backgroundColor: '#4ECDC4',
  },
  {
    id: 'game-3',
    title: 'Adventure World',
    description: 'Epic adventure awaits',
    previewImage: '/placeholder-adventure.jpg',
    backgroundColor: '#45B7D1',
  },
  {
    id: 'game-4',
    title: 'Sports Arena',
    description: 'Compete in sports',
    previewImage: '/placeholder-sports.jpg',
    backgroundColor: '#FFA07A',
  },
] as const;
