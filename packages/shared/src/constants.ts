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

  // Room rejoin (TV refresh persistence)
  ROOM_REJOIN: 'room:rejoin',
  ROOM_REJOINED: 'room:rejoined',

  // Navigation events
  NAVIGATION_INPUT: 'navigation:input',
  NAVIGATION_UPDATE: 'navigation:update',

  // Screen state (TV → Mobile)
  SCREEN_UPDATE: 'screen:update',

  // System menu (Mobile triggers → TV displays; TV closes → Mobile clears)
  SYSTEM_MENU_OPEN: 'system-menu:open',
  SYSTEM_MENU_CLOSE: 'system-menu:close',
  SYSTEM_MENU_ACTION: 'system-menu:action',

  // Voice (mic on mobile → matcher on TV; TTS confirm round-trip)
  VOICE_TRANSCRIPT: 'voice:transcript',
  VOICE_CONFIRM_PROMPT: 'voice:confirm-prompt',
  VOICE_CONFIRM_RESPONSE: 'voice:confirm-response',
  VOICE_STATE: 'voice:state',

  // Game Studio (voice-driven game creation)
  //   STATE:  TV → Mobile — which creation phase to render + game version
  //   SUBMIT: Mobile → TV — a game idea (create) or an iteration prompt
  //   ACTION: Mobile → TV — discrete controls (ready / start / tab switch)
  STUDIO_STATE: 'studio:state',
  STUDIO_SUBMIT: 'studio:submit',
  STUDIO_ACTION: 'studio:action',
  //   GAME_STATE: TV → Mobile — live gameplay state (question / reveal / results)
  //   ANSWER:     Mobile → TV — the option a phone tapped
  STUDIO_GAME_STATE: 'studio:game-state',
  STUDIO_ANSWER: 'studio:answer',
} as const;

// Configuration
export const CONFIG = {
  ROOM_CODE_LENGTH: 6,
  SERVER_PORT: 3000,
  TV_PORT: 5173,
  MOBILE_PORT: 5174,
  ROOM_EXPIRY_MS: 3600000, // 1 hour
} as const;

// Pre-generated game-idea prompts for the Studio (prototype). The mic is faked:
// holding it drops a random one of these into the phone's text field, and the
// idea carousel scrolls through them. Users can then edit/send.
export const STUDIO_IDEAS = [
  'A Jeopardy-style trivia showdown about 90s pop culture',
  'A co-op word game where the whole room builds one sentence',
  'A drawing guess game with ridiculous prompts',
  'A music quiz where you name the movie from its soundtrack',
  'A bluffing game: invent a fake definition and fool your friends',
  'A rapid-fire "finish the lyric" karaoke battle',
  'A geography race — guess the country from three emojis',
  'A family feud style game about weird house rules',
  'A spot-the-difference showdown that gets faster each round',
  'A story-building game where each player adds one absurd twist',
] as const;

// Pre-generated iteration prompts for the Studio "Develop" chat (also faked mic).
export const STUDIO_ITERATIONS = [
  'Make the questions harder',
  'Add a lightning round at the end',
  'Give it a spooky Halloween theme',
  'Let up to 6 players join',
  'Add funny sound effects for wrong answers',
  'Make each round shorter and faster',
  'Add a daily double for bonus points',
  'Use more pop-culture categories',
] as const;

// Trivia bank for the Studio's playable round (prototype). Generic on purpose —
// the created game reflects the user's idea through its title/theme, while the
// questions themselves are a fixed, always-fun set.
export const STUDIO_QUESTIONS = [
  {
    prompt: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Mars', 'Jupiter', 'Mercury'],
    correctIndex: 1,
  },
  {
    prompt: 'How many strings does a standard guitar have?',
    options: ['4', '5', '6', '7'],
    correctIndex: 2,
  },
  {
    prompt: 'What is the largest ocean on Earth?',
    options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'],
    correctIndex: 3,
  },
  {
    prompt: 'Which animal is the fastest land animal?',
    options: ['Cheetah', 'Lion', 'Horse', 'Greyhound'],
    correctIndex: 0,
  },
  {
    prompt: 'In which country would you find the Eiffel Tower?',
    options: ['Italy', 'Spain', 'France', 'Belgium'],
    correctIndex: 2,
  },
  {
    prompt: 'What is the chemical symbol for gold?',
    options: ['Gd', 'Au', 'Ag', 'Go'],
    correctIndex: 1,
  },
] as const;

// How many questions make up one round.
export const STUDIO_ROUND_LENGTH = 5;
// Points for a correct answer, and how long the TV lingers on each state (ms).
export const STUDIO_POINTS_PER_CORRECT = 100;
export const STUDIO_REVEAL_MS = 2600;

// Map a free-text game idea to a game kind + a punchy title. Keyword-matched;
// falls back to a trivia game. Deterministic (no randomness) so the TV and any
// late-joining phone always agree on the same generated title.
export function deriveStudioGame(idea: string): {
  title: string;
  kind: 'trivia' | 'word' | 'drawing' | 'music' | 'bluff';
} {
  const text = idea.toLowerCase();
  const rules: {
    kind: 'trivia' | 'word' | 'drawing' | 'music' | 'bluff';
    match: string[];
    titles: string[];
  }[] = [
    { kind: 'music', match: ['music', 'song', 'lyric', 'karaoke', 'soundtrack', 'tune', 'melody'], titles: ['SOUND CHECK', 'NAME THAT TUNE', 'LYRIC LEGENDS'] },
    { kind: 'drawing', match: ['draw', 'sketch', 'doodle', 'paint'], titles: ['SKETCH IT', 'DOODLE DASH', 'DRAW OFF'] },
    { kind: 'word', match: ['word', 'sentence', 'spell', 'letter', 'story', 'vocab'], titles: ['WORD CHAIN', 'WORDPLAY', 'CHAIN REACTION'] },
    { kind: 'bluff', match: ['bluff', 'fake', 'definition', 'fool', 'lie', 'fib'], titles: ['BLUFF IT', 'FIB FINDER', 'FAKE OUT'] },
    { kind: 'trivia', match: ['trivia', 'quiz', 'jeopardy', 'question', 'guess', 'feud', 'knowledge', 'geography', 'emoji'], titles: ['TRIVIA RUSH', 'BRAIN BLITZ', 'QUIZ WHIZ'] },
  ];
  const matched = rules.find((r) => r.match.some((k) => text.includes(k)));
  const fallback = { kind: 'trivia' as const, titles: ['GAME ON', 'WEEKEND ORIGINAL', 'INSTANT CLASSIC'] };
  const chosen = matched ?? fallback;
  // Deterministic pick from the pool based on idea length.
  const title = chosen.titles[idea.trim().length % chosen.titles.length];
  return { title, kind: chosen.kind };
}

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
  {
    id: 'game-5',
    title: "Wit's End",
    description: 'Trivia showdown',
    previewImage: '/placeholder-wits-end.jpg',
    backgroundColor: '#8B5CF6',
  },
] as const;
