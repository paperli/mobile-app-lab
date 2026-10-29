// ─────────────────────────────────────────────────────────────────────────
//  Weekend catalog — the real game line-up the personalization engine ranks.
//
//  Source of truth for which games exist and whether they are live: the
//  Shipyard Game Status Page in Notion (last updated 2026-10-26: 23 live,
//  6 greenlit). The seven pre-Shipyard titles (Jeopardy!, Song Quiz, …) are
//  the remaining "live" count on that page.
//
//  Taxonomy provenance, per entry:
//    · `// proposal` — backfilled from the game's "Game Description" deck
//      (genre, theme, player count, interaction, pitch).
//    · `// guess`    — no deck yet; a best guess to replace once one exists.
//  The decks use a wider genre vocabulary than the engine; each game's
//  first-listed genre is mapped onto ours (Card → Strategy, Arcade → Action,
//  Game Show → Trivia) and the rest is kept in `themes`.
//
//  Lifecycle is 'New' for greenlit titles and anything released within 30
//  days of the Notion page's last update; everything else is 'Evergreen'.
//
//  Tiles: real exported art where it exists — the hub9 set, plus the Drive
//  "game previews" export copied to public/games/catalog/<id>/tile.jpg. Games
//  without a tile yet (greenlit titles, and recent launches whose art is not
//  in the export) have no `art` and render the procedural `theme` tile.
// ─────────────────────────────────────────────────────────────────────────

import type { HubGame } from '../prototype/hub/games';
import { assetUrl } from '../utils/assetUrl';
import type { Tax } from './library';
import type { GameStatus } from './types';

export interface CatalogEntry {
  game: HubGame;
  tax: Tax;
  status: GameStatus;
  /** First-cohort release date (ISO), or null when not yet scheduled to a day. */
  releaseDate: string | null;
}

const hub9Tile = (id: string) => ({ tile: assetUrl(`/games/hub9/${id}/tile.png`) });
const catalogTile = (id: string) => ({ tile: assetUrl(`/games/catalog/${id}/tile.jpg`) });

export const WEEKEND_CATALOG: CatalogEntry[] = [
  // ── Pre-Shipyard live titles ─────────────────────────────────────────────
  {
    // guess
    game: {
      id: 'jeopardy',
      title: 'Jeopardy!',
      description: 'The iconic answer-and-question quiz show, now on your TV.',
      players: '1–3 Players',
      interaction: 'Voice Controlled',
      theme: { base: '#03113f', from: '#061a5c', to: '#1e49c7', accent: '#f7c948', pattern: 'grid', logo: 'serif', motif: '💡' },
      art: hub9Tile('jeopardy'),
    },
    tax: { genre: 'Trivia', themes: ['general knowledge', 'game show'], lifecycle: 'Evergreen', trending: 0.74, editorial: 0.2, difficulty: 'Hard', motivations: ['Knowledge', 'Mastery', 'Social Competition'], session: 25 },
    status: 'Live',
    releaseDate: null,
  },
  {
    // guess
    game: {
      id: 'song-quiz',
      title: 'Song Quiz',
      description: 'Name the hit song from a short clip before your friends do.',
      players: '1–6 Players',
      interaction: 'Voice Controlled',
      theme: { base: '#1a0b3d', from: '#3a0f7a', to: '#7b2ff7', accent: '#22d3ee', pattern: 'bars', logo: 'block', motif: '🎵' },
      art: hub9Tile('song-quiz'),
    },
    tax: { genre: 'Music', themes: ['pop', 'nostalgia', 'party'], lifecycle: 'Evergreen', trending: 0.84, editorial: 0.3, motivations: ['Knowledge', 'Social Competition', 'Performance'] },
    status: 'Live',
    releaseDate: null,
  },
  {
    // guess
    game: {
      id: 'wheel-of-fortune',
      title: 'Wheel of Fortune',
      description: 'Spin the wheel, solve the puzzle and win big.',
      players: '1–3 Players',
      interaction: 'Voice Controlled',
      theme: { base: '#0c1f14', from: '#123a24', to: '#1f9d57', accent: '#ffd23f', pattern: 'grid', logo: 'serif', motif: '🎡' },
      art: hub9Tile('wheel-of-fortune'),
    },
    tax: { genre: 'Word', themes: ['puzzle', 'game show'], lifecycle: 'Evergreen', trending: 0.7, editorial: 0.2, session: 20 },
    status: 'Live',
    releaseDate: null,
  },
  {
    // guess
    game: {
      id: 'wits-end',
      title: "Wit's End",
      description: 'A fantasy trivia adventure for the quickest thinkers.',
      players: '1–3 Players',
      interaction: 'Voice Controlled',
      theme: { base: '#100b06', from: '#241a10', to: '#5a3d1f', accent: '#e0a94f', pattern: 'rays', logo: 'serif', motif: '🪓' },
      art: hub9Tile('wits-end'),
    },
    tax: { genre: 'Trivia', themes: ['fantasy', 'adventure', 'story'], lifecycle: 'Evergreen', trending: 0.6, editorial: 0.18, difficulty: 'Hard' },
    status: 'Live',
    releaseDate: null,
  },
  {
    // guess
    game: {
      id: 'cocomelon',
      title: 'CoComelon',
      description: 'Sing, dance and play along with JJ and friends.',
      players: 'Single Player',
      interaction: 'Voice Controlled',
      theme: { base: '#1a7fd4', from: '#3aa0e8', to: '#8fd14f', accent: '#ffd23f', ink: '#0a2a4a', light: true, pattern: 'dots', logo: 'rounded', motif: '🍉' },
      art: hub9Tile('cocomelon'),
    },
    tax: { genre: 'Kids', themes: ['nursery', 'sing-along', 'family'], lifecycle: 'Evergreen', trending: 0.55, editorial: 0.35, session: 10 },
    status: 'Live',
    releaseDate: null,
  },
  {
    // proposal: Trivia, Party
    game: {
      id: 'spot-on',
      title: 'Spot On',
      description: "Race to drop your pin on the globe. You don't know geography — guess anyway.",
      players: '1–4 Players',
      interaction: 'Gesture Controlled',
      theme: { base: '#02040f', from: '#071634', to: '#155e9c', accent: '#f5b642', pattern: 'waves', logo: 'block', motif: '🌍' },
      art: hub9Tile('spot-on'),
    },
    tax: { genre: 'Trivia', themes: ['geography', 'landmarks', 'globe', 'party'], lifecycle: 'Evergreen', trending: 0.58, editorial: 0.18, difficulty: 'Easy', motivations: ['Knowledge', 'Social Competition'], session: 15 },
    status: 'Live',
    releaseDate: null,
  },
  {
    // guess
    game: {
      id: 'sketchy-af',
      title: 'Sketchy AF',
      description: 'Draw it, guess it, then laugh about it together.',
      players: '1–4 Players',
      interaction: 'Gesture Controlled',
      theme: { base: '#efeee9', from: '#f7f6f2', to: '#e3e2dc', accent: '#f72149', ink: '#141414', light: true, pattern: 'sketch', logo: 'script', motif: '✏️' },
      art: hub9Tile('sketchy-af'),
    },
    tax: { genre: 'Party', themes: ['drawing', 'comedy'], lifecycle: 'Evergreen', trending: 0.72, editorial: 0.25, motivations: ['Creativity', 'Social Competition'], competition: ['PvP'], interactions: ['Touch', 'Voice'] },
    status: 'Live',
    releaseDate: null,
  },

  // ── Shipyard — live ──────────────────────────────────────────────────────
  {
    // proposal: Puzzle, Simple Activity, Trivia, Party
    game: {
      id: 'guess-the-emoji',
      title: 'Guess the Emoji',
      description: 'Decode the emoji and shout the answer before the letters reveal.',
      players: '1–6 Players',
      interaction: 'Voice Controlled',
      theme: { base: '#1a0b2e', from: '#6d28d9', to: '#f472b6', accent: '#fde047', pattern: 'confetti', logo: 'rounded', motif: '😄' },
      art: hub9Tile('guess-the-emoji'),
    },
    tax: { genre: 'Puzzle', themes: ['emoji', 'rebus', 'comedy', 'family', 'party'], lifecycle: 'Evergreen', trending: 0.82, editorial: 0.3, motivations: ['Knowledge', 'Social Competition'], difficulty: 'Easy', session: 12, competition: ['PvP'], audiences: ['Family', 'Adults'], interactions: ['Voice', 'Buzzer'] },
    status: 'Live',
    releaseDate: '2026-07-21',
  },
  {
    // proposal: Party, Puzzle
    game: {
      id: 'werds',
      title: 'Werds Pur Minite',
      description: 'A couch party typing game where every typo is permanent.',
      players: '1–4 Players',
      interaction: 'Typing',
      theme: { base: '#07231f', from: '#0c3a33', to: '#14b8a6', accent: '#fde047', pattern: 'grid', logo: 'block', motif: '⌨️' },
      art: hub9Tile('werds'),
    },
    tax: { genre: 'Party', themes: ['typing', 'words', 'comedy', 'sabotage'], lifecycle: 'Evergreen', trending: 0.78, editorial: 0.25, motivations: ['Social Competition', 'Mastery'], difficulty: 'Medium', session: 10, competition: ['PvP'], cooperation: ['None'], interactions: ['Touch'] },
    status: 'Live',
    releaseDate: '2026-07-30',
  },
  {
    // proposal: Party, Entertainment
    game: {
      id: 'meme-supreme',
      title: 'Meme Supreme',
      description: 'Terrible scenarios. Perfect memes. The room votes, anonymously.',
      players: '3–8 Players',
      interaction: 'Touch Controlled',
      theme: { base: '#140a1f', from: '#2d0f4a', to: '#e11d74', accent: '#facc15', pattern: 'confetti', logo: 'block', motif: '😂' },
      art: catalogTile('meme-supreme'),
    },
    tax: { genre: 'Party', themes: ['memes', 'comedy', 'creativity', 'social media'], lifecycle: 'Evergreen', trending: 0.76, editorial: 0.22, motivations: ['Creativity', 'Social Competition'], session: 20, competition: ['PvP'], cooperation: ['None'], audiences: ['Adults'] },
    status: 'Live',
    releaseDate: '2026-08-14',
  },
  {
    // proposal: Party, Social — Players: 2–6
    game: {
      id: 'bffs',
      title: 'BFFs',
      description: 'Pick a side on every would-you-rather and find out who your real BFF is.',
      players: '2–6 Players',
      interaction: 'Touch Controlled',
      theme: { base: '#fdf2f8', from: '#fce7f3', to: '#f9a8d4', accent: '#7c3aed', ink: '#3b0a45', light: true, pattern: 'sketch', logo: 'script', motif: '💞' },
      art: catalogTile('bffs'),
    },
    tax: { genre: 'Party', themes: ['friendship', 'would-you-rather', 'comedy'], lifecycle: 'Evergreen', trending: 0.62, editorial: 0.2, motivations: ['Social Cooperation', 'Relaxation'], difficulty: 'Easy', session: 15, competition: ['PvP'], cooperation: ['None'], audiences: ['Family', 'Adults'] },
    status: 'Live',
    releaseDate: '2026-08-25',
  },
  {
    // proposal: Party — theme Numbers
    game: {
      id: 'bingo',
      title: 'Bingo',
      description: 'The TV calls the balls, your phone is your card. Slam BINGO first.',
      players: '1–8 Players',
      interaction: 'Touch Controlled',
      theme: { base: '#1e0b3a', from: '#3b0f6e', to: '#f43f5e', accent: '#fde047', pattern: 'dots', logo: 'rounded', motif: '🎱' },
      art: catalogTile('bingo'),
    },
    tax: { genre: 'Party', themes: ['numbers', 'bingo hall', 'luck'], lifecycle: 'Evergreen', trending: 0.6, editorial: 0.18, motivations: ['Relaxation', 'Social Competition'], difficulty: 'Easy', session: 15, competition: ['PvP'], cooperation: ['None'], audiences: ['Family', 'Adults'] },
    status: 'Live',
    releaseDate: '2026-09-02',
  },
  {
    // guess
    game: {
      id: 'word-rush',
      title: 'Word Rush',
      description: 'Rush to build words from the letters before the clock runs out.',
      players: '1–4 Players',
      interaction: 'Touch Controlled',
      theme: { base: '#0b0d0b', from: '#141a14', to: '#2a3a12', accent: '#c6f432', pattern: 'grid', logo: 'block', motif: '🔤' },
      art: catalogTile('word-rush'),
    },
    tax: { genre: 'Word', themes: ['vocabulary', 'speed', 'letters'], lifecycle: 'Evergreen', trending: 0.5, editorial: 0.12, motivations: ['Mastery', 'Social Competition'], session: 10 },
    status: 'Live',
    releaseDate: '2026-09-02',
  },
  {
    // proposal: Card, Party — 1–5 players, bots fill seats
    game: {
      id: 'weekend-poker',
      title: 'Weekend Poker',
      description: 'Your cards on your phone. Your poker face on the couch.',
      players: '1–5 Players',
      interaction: 'Touch Controlled',
      theme: { base: '#04140c', from: '#0a2a18', to: '#166534', accent: '#fbbf24', pattern: 'hex', logo: 'serif', motif: '🃏' },
      art: catalogTile('weekend-poker'),
    },
    tax: { genre: 'Strategy', themes: ['cards', "texas hold'em", 'tournament'], lifecycle: 'Evergreen', trending: 0.56, editorial: 0.18, motivations: ['Mastery', 'Social Competition'], difficulty: 'Medium', session: 30, competition: ['PvP'], audiences: ['Adults'] },
    status: 'Live',
    releaseDate: '2026-09-02',
  },
  {
    // proposal: Party, Puzzle — 1–6 players, 5-minute rounds
    game: {
      id: 'spot-the-gubs',
      title: 'Spot the Gubs',
      description: 'A frantic hidden-object game for the whole family.',
      players: '1–6 Players',
      interaction: 'Touch Controlled',
      theme: { base: '#0b1f2e', from: '#0f3b57', to: '#22c55e', accent: '#f97316', pattern: 'dots', logo: 'rounded', motif: '🔍' },
      art: catalogTile('spot-the-gubs'),
    },
    tax: { genre: 'Puzzle', themes: ['hidden object', 'creatures', 'family'], lifecycle: 'Evergreen', trending: 0.52, editorial: 0.2, motivations: ['Mastery', 'Relaxation', 'Social Competition'], difficulty: 'Easy', session: 8, competition: ['PvP'], audiences: ['Kids', 'Family'] },
    status: 'Live',
    releaseDate: '2026-09-15',
  },
  {
    // proposal: Trivia, Party — solo or rival teams, voice answers
    game: {
      id: 'short-list',
      title: 'Short List',
      description: 'Shout the answers most people would say. There are no bad ideas, just unpopular ones.',
      players: '1–8 Players',
      interaction: 'Voice Controlled',
      theme: { base: '#fefce8', from: '#fef9c3', to: '#fde047', accent: '#1d4ed8', ink: '#1c1917', light: true, pattern: 'grid', logo: 'block', motif: '🗒️' },
      art: catalogTile('short-list'),
    },
    tax: { genre: 'Trivia', themes: ['game show', 'survey', 'office', 'general knowledge'], lifecycle: 'Evergreen', trending: 0.6, editorial: 0.22, motivations: ['Knowledge', 'Social Competition', 'Social Cooperation'], difficulty: 'Easy', session: 20, competition: ['Team'], cooperation: ['TeamCoop'], interactions: ['Voice', 'Buzzer'] },
    status: 'Live',
    releaseDate: '2026-09-16',
  },
  {
    // guess
    game: {
      id: 'storytime',
      title: 'Storytime',
      description: 'Choose what happens next in a storybook you tell together.',
      players: '1–4 Players',
      interaction: 'Voice Controlled',
      theme: { base: '#140d05', from: '#2a1a0a', to: '#6b4515', accent: '#f2c46d', pattern: 'rays', logo: 'serif', motif: '📖' },
      art: catalogTile('storytime'),
    },
    tax: { genre: 'Kids', themes: ['storytelling', 'fairy tale', 'family'], lifecycle: 'Evergreen', trending: 0.48, editorial: 0.25, motivations: ['Creativity', 'Social Cooperation', 'Relaxation'], session: 15, competition: ['None'], cooperation: ['Coop'], audiences: ['Kids', 'Family'] },
    status: 'Live',
    releaseDate: '2026-09-25',
  },
  {
    // guess
    game: {
      id: 'weekend-pool',
      title: 'Weekend Pool',
      description: 'Line up the shot and sink the eight ball on the big screen.',
      players: '1–4 Players',
      interaction: 'Touch Controlled',
      theme: { base: '#04131a', from: '#063040', to: '#0e7490', accent: '#facc15', pattern: 'stripes', logo: 'block', motif: '🎱' },
      art: catalogTile('weekend-pool'),
    },
    tax: { genre: 'Action', themes: ['billiards', 'sports', 'skill'], lifecycle: 'Evergreen', trending: 0.46, editorial: 0.18, motivations: ['Mastery', 'Social Competition'], difficulty: 'Medium', session: 15, competition: ['PvP'], physical: false },
    status: 'Live',
    releaseDate: '2026-09-30',
  },
  {
    // proposal: Arcade, Party — 1–4 players, draw shapes on phone
    game: {
      id: 'cut-the-cake',
      title: 'Cut the Cake!',
      description: "Watch the TV. Draw what glows. Don't cut the cheese.",
      players: '1–4 Players',
      interaction: 'Gesture Controlled',
      theme: { base: '#2a0d1f', from: '#5b1740', to: '#f472b6', accent: '#fde68a', pattern: 'confetti', logo: 'rounded', motif: '🍰' },
    },
    tax: { genre: 'Action', themes: ['arcade', 'cake', 'slicing', 'co-op'], lifecycle: 'New', trending: 0.5, editorial: 0.45, motivations: ['Performance', 'Social Cooperation', 'Mastery'], difficulty: 'Medium', session: 12, competition: ['Performance'], cooperation: ['Coop'], audiences: ['Family', 'Adults'], physical: false },
    status: 'Live',
    releaseDate: '2026-10-01',
  },
  {
    // proposal: Game Show, Party — 1–4 players, bid by keypad or voice
    game: {
      id: 'the-price-is-right',
      title: 'The Price Is Right',
      description: 'Come on down, right from your couch. Closest without going over wins.',
      players: '1–4 Players',
      interaction: 'Voice Controlled',
      theme: { base: '#1a0533', from: '#3b0a6b', to: '#f59e0b', accent: '#fde047', pattern: 'rays', logo: 'block', motif: '💰' },
      art: catalogTile('the-price-is-right'),
    },
    tax: { genre: 'Trivia', themes: ['game show', 'prices', 'plinko', 'prizes'], lifecycle: 'New', trending: 0.64, editorial: 0.5, motivations: ['Knowledge', 'Social Competition'], difficulty: 'Easy', session: 25, competition: ['PvP'], audiences: ['Family', 'Adults'], interactions: ['Voice', 'Touch'] },
    status: 'Live',
    releaseDate: '2026-10-06',
  },
  {
    // guess
    game: {
      id: 'marble-race',
      title: 'Marble Race',
      description: 'Pick your marble and cheer it down a wild track.',
      players: '1–8 Players',
      interaction: 'Touch Controlled',
      theme: { base: '#06101f', from: '#0b2447', to: '#3b82f6', accent: '#f43f5e', pattern: 'stripes', logo: 'block', motif: '🔮' },
    },
    tax: { genre: 'Party', themes: ['racing', 'luck', 'spectacle'], lifecycle: 'New', trending: 0.45, editorial: 0.45, motivations: ['Relaxation', 'Social Competition'], difficulty: 'Easy', session: 10, competition: ['PvP'], cooperation: ['None'], audiences: ['Kids', 'Family', 'Adults'] },
    status: 'Live',
    releaseDate: '2026-10-08',
  },
  {
    // guess
    game: {
      id: 'gibberish',
      title: 'Gibberish',
      description: 'Say the nonsense out loud until the room hears the real phrase.',
      players: '2–8 Players',
      interaction: 'Voice Controlled',
      theme: { base: '#1c0a00', from: '#431407', to: '#f97316', accent: '#a3e635', pattern: 'confetti', logo: 'rounded', motif: '🗣️' },
    },
    tax: { genre: 'Word', themes: ['wordplay', 'phonetics', 'comedy', 'party'], lifecycle: 'New', trending: 0.42, editorial: 0.5, motivations: ['Knowledge', 'Social Competition', 'Performance'], difficulty: 'Easy', session: 15, competition: ['PvP', 'Team'], audiences: ['Family', 'Adults'], interactions: ['Voice', 'Buzzer'] },
    status: 'Live',
    releaseDate: '2026-10-19',
  },
  {
    // proposal: Trivia, Party, Educational — 1–6 players, phone colour wheel
    game: {
      id: 'color-matchup',
      title: 'Color Matchup',
      description: 'Match the gallery colours from memory. Outshine your friends.',
      players: '1–6 Players',
      interaction: 'Touch Controlled',
      theme: { base: '#f5f3ee', from: '#fafaf7', to: '#e7e1d5', accent: '#e11d48', ink: '#1f1a14', light: true, pattern: 'waves', logo: 'serif', motif: '🎨' },
    },
    tax: { genre: 'Trivia', themes: ['color', 'art', 'memory', 'educational'], lifecycle: 'New', trending: 0.38, editorial: 0.55, motivations: ['Mastery', 'Knowledge', 'Social Competition'], difficulty: 'Adaptive', session: 12, competition: ['PvP'], audiences: ['Family', 'Adults'], interactions: ['Touch'] },
    status: 'Live',
    releaseDate: '2026-10-22',
  },

  // ── Shipyard — greenlit (target November 2026; all guesses) ──────────────
  {
    // guess
    game: {
      id: 'drop-the-beat',
      title: 'Drop the Beat',
      description: 'Tap in time and keep the track alive for the whole room.',
      players: '1–4 Players',
      interaction: 'Touch Controlled',
      theme: { base: '#0a0118', from: '#1e0640', to: '#a21caf', accent: '#22d3ee', pattern: 'bars', logo: 'stencil', motif: '🥁' },
    },
    tax: { genre: 'Music', themes: ['rhythm', 'beats', 'party'], lifecycle: 'New', trending: 0.3, editorial: 0.6, motivations: ['Performance', 'Mastery'], difficulty: 'Adaptive', session: 12, interactions: ['Touch'] },
    status: 'Greenlit',
    releaseDate: null,
  },
  {
    // guess
    game: {
      id: 'millionaire',
      title: 'Who Wants To Be A Millionaire',
      description: 'Fifteen questions, three lifelines, one million dollars.',
      players: '1–4 Players',
      interaction: 'Voice Controlled',
      theme: { base: '#02031a', from: '#0a0f4a', to: '#4338ca', accent: '#e5e7eb', pattern: 'rays', logo: 'serif', motif: '💎' },
    },
    tax: { genre: 'Trivia', themes: ['game show', 'general knowledge', 'lifelines'], lifecycle: 'New', trending: 0.35, editorial: 0.65, motivations: ['Knowledge', 'Mastery'], difficulty: 'Hard', session: 20, competition: ['PvE', 'PvP'], audiences: ['Family', 'Adults'] },
    status: 'Greenlit',
    releaseDate: null,
  },
  {
    // guess
    game: {
      id: 'tri-peaks-solitaire',
      title: 'Tri-Peaks Solitaire',
      description: 'Clear the three peaks one card higher or lower at a time.',
      players: 'Single Player',
      interaction: 'Touch Controlled',
      theme: { base: '#052e16', from: '#14532d', to: '#16a34a', accent: '#fef3c7', pattern: 'hex', logo: 'serif', motif: '♠️' },
    },
    tax: { genre: 'Puzzle', themes: ['cards', 'solitaire', 'relaxing'], lifecycle: 'New', trending: 0.3, editorial: 0.55, motivations: ['Relaxation', 'Mastery'], difficulty: 'Medium', session: 10, competition: ['PvE'], audiences: ['Adults', 'Family'] },
    status: 'Greenlit',
    releaseDate: null,
  },
  {
    // guess — "AYS" on the Notion page
    game: {
      id: 'are-you-smarter',
      title: 'Are You Smarter Than a 5th Grader?',
      description: 'Grade-school questions, grown-up stakes. Can you beat the class?',
      players: '1–4 Players',
      interaction: 'Voice Controlled',
      theme: { base: '#0c1a3a', from: '#13306b', to: '#2563eb', accent: '#facc15', pattern: 'grid', logo: 'block', motif: '🎒' },
    },
    tax: { genre: 'Trivia', themes: ['game show', 'school', 'general knowledge', 'family'], lifecycle: 'New', trending: 0.32, editorial: 0.6, motivations: ['Knowledge', 'Social Competition'], difficulty: 'Medium', session: 20, competition: ['PvP', 'PvE'], audiences: ['Family', 'Adults'], interactions: ['Voice', 'Buzzer'] },
    status: 'Greenlit',
    releaseDate: null,
  },
  {
    // guess
    game: {
      id: 'outta-the-zoo',
      title: 'Outta the Zoo',
      description: 'Help the animals break out before the keeper notices.',
      players: '1–4 Players',
      interaction: 'Touch Controlled',
      theme: { base: '#1a2e05', from: '#365314', to: '#84cc16', accent: '#f97316', ink: '#1a2e05', light: true, pattern: 'dots', logo: 'rounded', motif: '🦒' },
    },
    tax: { genre: 'Kids', themes: ['animals', 'escape', 'family', 'co-op'], lifecycle: 'New', trending: 0.3, editorial: 0.55, motivations: ['Social Cooperation', 'Creativity'], session: 12, competition: ['None'], cooperation: ['Coop'], audiences: ['Kids', 'Family'] },
    status: 'Greenlit',
    releaseDate: null,
  },
  {
    // guess — working name; motion capture through the phone's camera
    game: {
      id: 'camera-game',
      title: 'Camera Game',
      description: "Prop up your phone and play with your whole body — its camera reads your pose.",
      players: '1–4 Players',
      interaction: 'Motion Capture',
      theme: { base: '#0c0a09', from: '#292524', to: '#dc2626', accent: '#fde047', pattern: 'stripes', logo: 'stencil', motif: '📸' },
    },
    tax: { genre: 'Action', themes: ['motion', 'fitness', 'party'], lifecycle: 'New', trending: 0.3, editorial: 0.55, motivations: ['Performance', 'Social Competition'], session: 12, competition: ['PvP', 'Performance'], audiences: ['Family', 'Adults'] },
    status: 'Greenlit',
    releaseDate: null,
  },
];
