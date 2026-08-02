// ─────────────────────────────────────────────────────────────────────────
//  Hub Layout Prototype — 30-game dataset
//
//  Code-only prototype (no raster art). Every game carries a `theme` that the
//  reusable art system (GameArt / GameLogo) turns into a stylized hero, tile,
//  logo and screenshots at runtime. The 7 "featured" games mirror the real
//  titles on the Figma hub screens; the other 23 are plausible party titles
//  used to stress the layout at scale.
//
//  Asset specs followed by the art components:
//    - Game tile:  16:9, 387×219 render, 6px corner radius
//    - Hero v2:    1920×800 band, right-aligned art, left/bottom fades
//  See https://volley-inc.github.io/arcade-runbook/{game-tile,hero-v2}.html
// ─────────────────────────────────────────────────────────────────────────

/** How a controller drives the game. */
export type Interaction =
  | 'Voice Controlled'
  | 'Gyro Controlled'
  | 'Gesture Controlled'
  | 'Motion Capture'
  | 'Touch Controlled'
  | 'Typing'
  | 'Buzzer';

/** Background pattern motif used by GameArt. */
export type PatternKind =
  | 'rays' // game-show spotlight fan
  | 'bars' // equalizer / audio bars
  | 'grid' // trivia board / letter grid
  | 'dots' // playful dot matrix
  | 'confetti' // party scatter
  | 'waves' // concentric arcs / globe
  | 'stripes' // diagonal energy stripes
  | 'sketch' // light paper doodle
  | 'hex'; // techy / brainy lattice

/** Logotype treatment used by GameLogo. */
export type LogoStyle =
  | 'block' // heavy condensed uppercase
  | 'serif' // classic game-show serif
  | 'script' // friendly italic
  | 'rounded' // soft kid-friendly
  | 'stencil'; // bold outlined

export interface GameTheme {
  /** Darkest surface color — fills behind everything. */
  base: string;
  /** Gradient start (usually deep). */
  from: string;
  /** Gradient mid/end (usually brighter). */
  to: string;
  /** Accent for logo, pills, glow, screenshot chrome. */
  accent: string;
  /** Logotype ink. Defaults to warm-white; set dark on light themes. */
  ink?: string;
  /** True for bright/light-surface games (paper, primary-color kids art). */
  light?: boolean;
  pattern: PatternKind;
  logo: LogoStyle;
  /** Emoji motif that gives the art character (right-side focal subject). */
  motif: string;
}

/**
 * Real exported art for a game. When present, the art system (GameArt /
 * GameLogo) renders these raster assets instead of the procedural theme art:
 *   · tile    — fully-composed 16:9 tile (logo baked in)
 *   · preview — wide "Top Game Preview" scene for the hero/preview band
 *   · logo    — transparent wordmark PNG (overlaid on the preview band)
 *   · shots   — real 16:9 in-game captures, in carousel order
 * Any missing field falls back to the procedural `theme` rendering.
 */
export interface GameArtAssets {
  tile?: string;
  preview?: string;
  logo?: string;
  shots?: string[];
}

export interface HubGame {
  id: string;
  title: string;
  /** One-sentence pitch. */
  description: string;
  /** "Single Player" or "1–N Players". */
  players: string;
  interaction: Interaction;
  /** Mirrors a real Figma hub title — gets bespoke palette tuning. */
  featured?: boolean;
  theme: GameTheme;
  /** Real exported art; falls back to the procedural `theme` when absent. */
  art?: GameArtAssets;
}

// ── Featured 7 (match the Figma hub art) ───────────────────────────────────

const FEATURED: HubGame[] = [
  {
    id: 'jeopardy',
    title: 'Jeopardy!',
    description: 'The iconic answer-and-question quiz show, now on your TV.',
    players: '1–3 Players',
    interaction: 'Voice Controlled',
    featured: true,
    theme: {
      base: '#03113f',
      from: '#061a5c',
      to: '#1e49c7',
      accent: '#f7c948',
      pattern: 'grid',
      logo: 'serif',
      motif: '💡',
    },
  },
  {
    id: 'song-quiz',
    title: 'Song Quiz',
    description: 'Name the hit song from a short clip before your friends do.',
    players: '1–4 Players',
    interaction: 'Voice Controlled',
    featured: true,
    theme: {
      base: '#1a0b3d',
      from: '#3a0f7a',
      to: '#7b2ff7',
      accent: '#22d3ee',
      pattern: 'bars',
      logo: 'block',
      motif: '🎵',
    },
  },
  {
    id: 'cocomelon',
    title: 'CoComelon Sing & Play',
    description: 'Sing, dance and play along with JJ and friends.',
    players: 'Single Player',
    interaction: 'Motion Capture',
    featured: true,
    theme: {
      base: '#1a7fd4',
      from: '#3aa0e8',
      to: '#8fd14f',
      accent: '#ffd23f',
      ink: '#0a2a4a',
      light: true,
      pattern: 'dots',
      logo: 'rounded',
      motif: '🍉',
    },
  },
  {
    id: 'wheel-of-fortune',
    title: 'Wheel of Fortune',
    description: 'Spin the wheel, solve the puzzle and win big.',
    players: '1–3 Players',
    interaction: 'Voice Controlled',
    featured: true,
    theme: {
      base: '#0c1f14',
      from: '#123a24',
      to: '#1f9d57',
      accent: '#ffd23f',
      pattern: 'grid',
      logo: 'serif',
      motif: '🎡',
    },
  },
  {
    id: 'wits-end',
    title: "Wit's End",
    description: 'A fantasy trivia adventure for the quickest thinkers.',
    players: '1–4 Players',
    interaction: 'Voice Controlled',
    featured: true,
    theme: {
      base: '#100b06',
      from: '#241a10',
      to: '#5a3d1f',
      accent: '#e0a94f',
      pattern: 'rays',
      logo: 'serif',
      motif: '🪓',
    },
  },
  {
    id: 'sketchy-af',
    title: 'Sketchy AF',
    description: 'Draw it, guess it, then laugh about it together.',
    players: '1–8 Players',
    interaction: 'Gesture Controlled',
    featured: true,
    theme: {
      base: '#efeee9',
      from: '#f7f6f2',
      to: '#e3e2dc',
      accent: '#f72149',
      ink: '#141414',
      light: true,
      pattern: 'sketch',
      logo: 'script',
      motif: '✏️',
    },
  },
  {
    id: 'spot-on',
    title: 'Spot On',
    description: 'Race to pinpoint places on a spinning globe.',
    players: '1–4 Players',
    interaction: 'Gyro Controlled',
    featured: true,
    theme: {
      base: '#02040f',
      from: '#071634',
      to: '#155e9c',
      accent: '#f5b642',
      pattern: 'waves',
      logo: 'block',
      motif: '🌍',
    },
  },
];

// ── 23 more (variety of interaction methods + player counts) ───────────────

const MORE: HubGame[] = [
  {
    id: 'trivia-royale',
    title: 'Trivia Royale',
    description: 'Buzz in fast across 12 categories in a last-one-standing showdown.',
    players: '2–8 Players',
    interaction: 'Buzzer',
    theme: { base: '#1a0533', from: '#3d0a66', to: '#c026d3', accent: '#fde047', pattern: 'rays', logo: 'block', motif: '👑' },
  },
  {
    id: 'charades-live',
    title: 'Charades Live',
    description: 'Act out the clue while your team races the clock to guess it.',
    players: '2–8 Players',
    interaction: 'Motion Capture',
    theme: { base: '#0a1f2e', from: '#0f3a52', to: '#06b6d4', accent: '#fb7185', pattern: 'confetti', logo: 'rounded', motif: '🎭' },
  },
  {
    id: 'doodle-dash',
    title: 'Doodle Dash',
    description: 'Sketch the secret word before the ink runs out.',
    players: '1–6 Players',
    interaction: 'Gesture Controlled',
    theme: { base: '#f2efe8', from: '#faf8f2', to: '#e7e3d8', accent: '#2145f7', ink: '#171717', light: true, pattern: 'sketch', logo: 'script', motif: '🖍️' },
  },
  {
    id: 'beat-breaker',
    title: 'Beat Breaker',
    description: 'Tilt to the rhythm and shatter the beat as it drops.',
    players: '1–4 Players',
    interaction: 'Gyro Controlled',
    theme: { base: '#20062b', from: '#4a0d5e', to: '#ec4899', accent: '#22d3ee', pattern: 'bars', logo: 'block', motif: '🥁' },
  },
  {
    id: 'word-rush',
    title: 'Word Rush',
    description: 'Shout longer words than everyone else before time expires.',
    players: '1–6 Players',
    interaction: 'Voice Controlled',
    theme: { base: '#07231f', from: '#0c3a33', to: '#10b981', accent: '#fde047', pattern: 'grid', logo: 'block', motif: '🔤' },
  },
  {
    id: 'emoji-riddle',
    title: 'Emoji Riddle',
    description: 'Decode the phrase hidden inside a string of emoji.',
    players: '1–8 Players',
    interaction: 'Voice Controlled',
    theme: { base: '#2b1206', from: '#5e2a0d', to: '#f97316', accent: '#facc15', pattern: 'confetti', logo: 'rounded', motif: '🤔' },
  },
  {
    id: 'pixel-painters',
    title: 'Pixel Painters',
    description: 'Paint the prompt one pixel at a time and vote on the best.',
    players: '2–6 Players',
    interaction: 'Gesture Controlled',
    theme: { base: '#0b1026', from: '#141c4a', to: '#6366f1', accent: '#f472b6', pattern: 'dots', logo: 'stencil', motif: '🎨' },
  },
  {
    id: 'karaoke-kings',
    title: 'Karaoke Kings',
    description: 'Belt the chorus and let the crowd score your pitch.',
    players: '1–8 Players',
    interaction: 'Voice Controlled',
    theme: { base: '#2a0716', from: '#5e0f30', to: '#f43f5e', accent: '#fbbf24', pattern: 'bars', logo: 'script', motif: '🎤' },
  },
  {
    id: 'dance-floor',
    title: 'Dance Floor',
    description: 'Mirror the moves on screen and light up the floor.',
    players: '1–4 Players',
    interaction: 'Motion Capture',
    theme: { base: '#12043a', from: '#2c0b73', to: '#8b5cf6', accent: '#34d399', pattern: 'stripes', logo: 'block', motif: '🕺' },
  },
  {
    id: 'guess-the-movie',
    title: 'Guess the Movie',
    description: 'Name the film from a three-second scene and a single frame.',
    players: '1–6 Players',
    interaction: 'Voice Controlled',
    theme: { base: '#050505', from: '#161616', to: '#dc2626', accent: '#facc15', pattern: 'rays', logo: 'serif', motif: '🎬' },
  },
  {
    id: 'sports-iq',
    title: 'Sports IQ',
    description: 'Buzz in with the play-by-play across every league you love.',
    players: '2–6 Players',
    interaction: 'Buzzer',
    theme: { base: '#04231a', from: '#0a4531', to: '#059669', accent: '#f97316', pattern: 'stripes', logo: 'stencil', motif: '🏆' },
  },
  {
    id: 'escape-room',
    title: 'Escape the Room',
    description: 'Solve the puzzle chain and unlock the door before the timer ends.',
    players: '1–4 Players',
    interaction: 'Gesture Controlled',
    theme: { base: '#0a0a12', from: '#1a1a2e', to: '#475569', accent: '#22d3ee', pattern: 'hex', logo: 'stencil', motif: '🔐' },
  },
  {
    id: 'mind-meld',
    title: 'Mind Meld',
    description: 'Say the same word as your partner without saying a thing first.',
    players: '2–8 Players',
    interaction: 'Voice Controlled',
    theme: { base: '#160b2e', from: '#2e155e', to: '#a855f7', accent: '#5eead4', pattern: 'hex', logo: 'rounded', motif: '🧠' },
  },
  {
    id: 'fitness-frenzy',
    title: 'Fitness Frenzy',
    description: 'Follow the trainer and burn through a living-room workout.',
    players: '1–4 Players',
    interaction: 'Motion Capture',
    theme: { base: '#04121f', from: '#0a2e45', to: '#0ea5e9', accent: '#f97316', pattern: 'waves', logo: 'block', motif: '💪' },
  },
  {
    id: 'puzzle-panic',
    title: 'Puzzle Panic',
    description: 'Rotate the pieces with a tilt before the grid overflows.',
    players: '1–2 Players',
    interaction: 'Gyro Controlled',
    theme: { base: '#0b1a2e', from: '#12345e', to: '#3b82f6', accent: '#f472b6', pattern: 'grid', logo: 'rounded', motif: '🧩' },
  },
  {
    id: 'story-builder',
    title: 'Story Builder',
    description: 'Add one line each and watch the tale spiral gloriously off track.',
    players: '2–8 Players',
    interaction: 'Voice Controlled',
    theme: { base: '#241206', from: '#4a2810', to: '#d97706', accent: '#fde68a', pattern: 'confetti', logo: 'script', motif: '📖' },
  },
  {
    id: 'quick-draw-duel',
    title: 'Quick Draw Duel',
    description: 'Sketch faster than your rival to win the round.',
    players: '2 Players',
    interaction: 'Gesture Controlled',
    theme: { base: '#efe9df', from: '#f7f2e9', to: '#e6ddcc', accent: '#dc2626', ink: '#1a1a1a', light: true, pattern: 'sketch', logo: 'stencil', motif: '⚡' },
  },
  {
    id: 'map-masters',
    title: 'Map Masters',
    description: 'Steer the pin to the country before your rivals lock in.',
    players: '1–6 Players',
    interaction: 'Gyro Controlled',
    theme: { base: '#031326', from: '#08315e', to: '#0284c7', accent: '#facc15', pattern: 'waves', logo: 'serif', motif: '🗺️' },
  },
  {
    id: 'music-maestro',
    title: 'Music Maestro',
    description: 'Conduct the orchestra with sweeping gestures in perfect time.',
    players: '1–4 Players',
    interaction: 'Motion Capture',
    theme: { base: '#1a0b2e', from: '#38175e', to: '#9333ea', accent: '#fbbf24', pattern: 'bars', logo: 'serif', motif: '🎻' },
  },
  {
    id: 'brain-bender',
    title: 'Brain Bender',
    description: 'Answer lateral-thinking riddles that get sneakier every round.',
    players: '1–4 Players',
    interaction: 'Voice Controlled',
    theme: { base: '#04231f', from: '#0a3f38', to: '#14b8a6', accent: '#f472b6', pattern: 'hex', logo: 'block', motif: '🌀' },
  },
  {
    id: 'party-charades',
    title: 'Party Charades',
    description: 'Team up and pantomime the prompt in a rowdy relay.',
    players: '4–10 Players',
    interaction: 'Motion Capture',
    theme: { base: '#2a0722', from: '#5e0f4a', to: '#db2777', accent: '#fde047', pattern: 'confetti', logo: 'rounded', motif: '🎉' },
  },
  {
    id: 'number-ninja',
    title: 'Number Ninja',
    description: 'Slice the equation that solves to the target number.',
    players: '1–4 Players',
    interaction: 'Gesture Controlled',
    theme: { base: '#160404', from: '#3a0a0a', to: '#ef4444', accent: '#22d3ee', pattern: 'stripes', logo: 'stencil', motif: '🔢' },
  },
  {
    id: 'trivia-titans',
    title: 'Trivia Titans',
    description: 'Buzz first to claim the points in a heavyweight quiz brawl.',
    players: '2–6 Players',
    interaction: 'Buzzer',
    theme: { base: '#0a0620', from: '#1a1050', to: '#4f46e5', accent: '#f59e0b', pattern: 'rays', logo: 'stencil', motif: '⚡' },
  },
];

export const HUB_GAMES: HubGame[] = [...FEATURED, ...MORE];

export const getGameById = (id: string): HubGame | undefined =>
  HUB_GAMES.find((g) => g.id === id);
