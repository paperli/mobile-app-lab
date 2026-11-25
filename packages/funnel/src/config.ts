// Content and offers for the funnel. Every landing page is data-driven: a
// game is one entry in GAMES plus its assets (teaser, poster, logo, hero).

const A = (p: string) => `${import.meta.env.BASE_URL}assets/${p}`;
export const asset = A;

export interface FunnelGame {
  id: string;
  /** The prod hub's id for this game (packages/tv/src/prototype/hub-prod/catalog.ts). */
  hubId: string;
  title: string;
  logo: string;
  video: string;
  poster: string;
  /** Merch hero, small, for the Desktop tab's laptop illustration. */
  hero: string;
  /** hub9 detail-page long description (packages/tv/src/prototype/hub9/games9.ts). */
  longDescription: string;
  players: string;
  category: string;
  control: string;
  ad: { caption: string; tags: string[] };
  /** Square-ish logos (aspect < 2) render taller so they read at the same weight. */
  logoShape: 'wide' | 'square';
  /** Free mobile version in the Weekend app (different from TV/desktop). The
   *  banner fades the hub's v3 preview scene into `accent`; `focus` is the crop. */
  mobileApp?: { accent: string; focus: string };
}

// One entry per game with a teaser, a merch hero, a logo and hub9 detail copy.
// players / interaction / longDescription come from hub9 games9.ts.
function game(g: Omit<FunnelGame, 'logo' | 'video' | 'poster' | 'hero' | 'hubId' | 'logoShape'> & { hubId?: string; logoShape?: FunnelGame['logoShape'] }): FunnelGame {
  return {
    hubId: g.id,
    logoShape: 'wide',
    logo: A(`img/${g.id}-logo.webp`),
    video: A(`video/${g.id}-teaser.mp4`),
    poster: A(`video/${g.id}-teaser-poster.jpg`),
    hero: A(`img/${g.id}-hero.webp`),
    ...g,
  };
}

export const GAMES: Record<string, FunnelGame> = Object.fromEntries(
  [
    game({
      id: 'jeopardy',
      mobileApp: { accent: '#0a1460', focus: '62% 50%' },
      title: 'Jeopardy!',
      longDescription:
        'The answer-and-question quiz show, set up for your living room. Pick your categories, buzz in out loud, and decide how much of your score to risk when Final Jeopardy! comes around.',
      players: '1–3 Players',
      category: 'Trivia',
      control: 'Voice Controlled',
      ad: { caption: 'Jeopardy! on your TV, no buzzer required. Answer out loud with friends and play tonight.', tags: ['#jeopardy', '#gamenight', '#trivia'] },
    }),
    game({
      id: 'song-quiz',
      mobileApp: { accent: '#1c0b52', focus: '60% 50%' },
      logoShape: 'square',
      title: 'Song Quiz',
      longDescription:
        'Hear a clip, name the song. Play across decades and genres, steal the point when the room hesitates, and settle who actually knows the words rather than just the chorus.',
      players: '1–4 Players',
      category: 'Music',
      control: 'Voice Controlled',
      ad: { caption: 'Name that song before your friends do. Shout it out, steal the point, play tonight on your TV.', tags: ['#songquiz', '#musictrivia', '#gamenight'] },
    }),
    game({
      id: 'spot-on',
      mobileApp: { accent: '#07131f', focus: '58% 50%' },
      title: 'Spot On',
      longDescription:
        'Race to pinpoint places on a spinning globe. Landmarks, cities and flags, from rounds anyone can win to ones that will start an argument about where exactly Madagascar is.',
      players: '1–4 Players',
      category: 'Geography',
      control: 'Gesture Controlled',
      ad: { caption: 'Spin the globe and pin it before anyone else. Geography night, on your TV.', tags: ['#spoton', '#geography', '#gamenight'] },
    }),
    game({
      id: 'guess-the-emoji',
      hubId: 'emoji-multiplatform',
      logoShape: 'square',
      title: 'Guess the Emoji',
      longDescription:
        'Crack the phrase hiding inside a string of emoji. Films, foods, sayings and things that only make sense the second somebody finally shouts the answer out.',
      players: '1–6 Players',
      category: 'Puzzle',
      control: 'Voice Controlled',
      ad: { caption: '🍿🦈🌊 = ? Crack the emoji phrase first. Shout it out with friends on your TV.', tags: ['#guesstheemoji', '#emoji', '#partygame'] },
    }),
    game({
      id: 'sketchy-af',
      logoShape: 'square',
      title: 'Sketchy AF',
      longDescription:
        'Draw it, guess it, then laugh about it. Everyone sketches on their own phone while the TV keeps score, and no artistic ability is required — or, frankly, expected.',
      players: '1–4 Players',
      category: 'Drawing',
      control: 'Voice Controlled',
      ad: { caption: 'Draw it on your phone, guess it on the TV. Zero art skills required.', tags: ['#sketchyaf', '#drawinggame', '#partygame'] },
    }),
    game({
      id: 'wits-end',
      title: "Wit's End",
      longDescription:
        'A fantasy trivia adventure with a story running between the questions. Answer to get through encounters, choose which way to go next, and find out how far what you know will carry you.',
      players: '1–3 Players',
      category: 'Trivia',
      control: 'Voice Controlled',
      ad: { caption: "A trivia quest where every answer moves the story. How far will your wits carry you?", tags: ['#witsend', '#trivia', '#fantasy'] },
    }),
  ].map((g) => [g.id, g])
);

export const DEFAULT_GAME = 'jeopardy';
export const isGameId = (id: string | null | undefined): id is string => !!id && id in GAMES;

/** Platforms the landing page lists under "Play it on". */
export const PLATFORMS = [
  { id: 'fire', name: 'Fire TV', logo: A('platforms/fire-tv.svg') },
  { id: 'roku', name: 'Roku', logo: A('platforms/roku.svg') },
  { id: 'samsung', name: 'Samsung', logo: A('platforms/samsung.svg') },
  { id: 'lg', name: 'LG', logo: A('platforms/lg-white.svg') },
] as const;

// ── Recommendation rows ────────────────────────────────────────────────────
// Titles and genres from packages/tv/src/personalization/catalog.ts.
export interface RowGame {
  id: string;
  title: string;
  meta: string;
}
const tile = (id: string) => A(`img/tiles/${id}.webp`);
export const tileFor = tile;

export const ROWS: { key: string; title: string; games: RowGame[] }[] = [
  {
    key: 'also-like',
    title: 'You Might Also Like',
    games: [
      { id: 'wheel-of-fortune', title: 'Wheel of Fortune', meta: 'Game show' },
      { id: 'millionaire', title: 'Who Wants To Be A Millionaire', meta: 'Game show' },
      { id: 'are-you-smarter', title: 'Are You Smarter Than a 5th Grader?', meta: 'Trivia' },
      { id: 'the-price-is-right', title: 'The Price Is Right', meta: 'Game show' },
      { id: 'song-quiz', title: 'Song Quiz', meta: 'Music trivia' },
      { id: 'wits-end', title: "Wit's End", meta: 'Trivia' },
    ],
  },
  {
    key: 'trending',
    title: 'Trending Now',
    games: [
      { id: 'weekend-poker', title: 'Weekend Poker', meta: 'Cards' },
      { id: 'guess-the-emoji', title: 'Guess the Emoji', meta: 'Party' },
      { id: 'bingo', title: 'Bingo', meta: 'Classic' },
      { id: 'sketchy-af', title: 'Sketchy AF', meta: 'Drawing' },
      { id: 'word-rush', title: 'Word Rush', meta: 'Word' },
      { id: 'spot-on', title: 'Spot On', meta: 'Geography' },
      { id: 'meme-supreme', title: 'Meme Supreme', meta: 'Party' },
      { id: 'marble-race', title: 'Marble Race', meta: 'Arcade' },
    ],
  },
];

// ── Plans section ──────────────────────────────────────────────────────────
// Prices from prod PaymentScreen2's preview plans ($18.99/mo, $99/yr).
export const PLAN_BLOCKS = [
  {
    id: 'monthly' as const,
    offer: 'social' as OfferId,
    name: 'Monthly',
    price: '$18.99',
    cadence: '/mo',
    detail: 'Billed monthly. Cancel anytime.',
    cta: 'Choose Monthly',
  },
  {
    id: 'annual' as const,
    offer: 'annual' as OfferId,
    name: 'Annual',
    price: '$99',
    cadence: '/yr',
    detail: 'Just $8.25/mo, billed annually. Free for a week.',
    badge: 'Save 57%',
    cta: 'Choose Annual',
  },
];
export const PLAN_INCLUDES = [
  'Every Weekend game, with new ones added often',
  'Play on your TV or computer',
  'Your phone is the controller',
  'Ad-free, cancel anytime',
];

// ── Offers ─────────────────────────────────────────────────────────────────
// Prod PaymentScreen2's dev-preview modes (hub/apps/web-checkout). The live
// offer comes from Amplitude; these are the two shapes the prototype can show.
export type OfferId = 'social' | 'annual';

export interface Offer {
  id: OfferId;
  label: string;
  title: string;
  valueProps: { icon: string; text: string }[];
  plans: null | { id: 'annual' | 'monthly'; title: string; price: string; cadence: string; detail: string; badge?: string }[];
  dueToday: string | null;
  cta: string;
  /** One line under the landing page's Join Now. */
  finePrint: string;
}

const VP_PLAYERS = { icon: A('icons/ticket-icon.svg'), text: 'Join 1M+ players' };
const VP_ADFREE = { icon: A('icons/gamepad-icon.svg'), text: 'Ad-free gaming experience' };

export const OFFERS: Record<OfferId, Offer> = {
  social: {
    id: 'social',
    label: 'Paid social',
    title: 'Start playing today',
    valueProps: [VP_PLAYERS, VP_ADFREE, { icon: A('icons/gift-icon.svg'), text: 'Just $3.25/week, billed monthly. Cancel anytime' }],
    plans: null,
    dueToday: null,
    cta: 'Subscribe',
    finePrint: 'Just $3.25/week, billed monthly. Cancel anytime.',
  },
  annual: {
    id: 'annual',
    label: 'Annual trial',
    title: 'Play Jeopardy!, Song Quiz, and more with your Weekend Game Pass',
    valueProps: [VP_PLAYERS, VP_ADFREE, { icon: A('icons/gift-icon.svg'), text: 'Free for a week, then $8.25/mo, billed annually.' }],
    plans: [
      { id: 'annual', title: 'Annual', price: '$99.00', cadence: '/yr', detail: 'Free for a week. Billed annually.', badge: 'Save 57%' },
      { id: 'monthly', title: 'Monthly', price: '$18.99', cadence: '/mo', detail: 'Free for a week. Cancel anytime.' },
    ],
    dueToday: '$0',
    cta: 'Start free trial',
    finePrint: 'Free for a week. Cancel anytime.',
  },
};

// ── Looks ──────────────────────────────────────────────────────────────────
// Page hue + teaser frame variants (styles.css `.wk[data-look]`).
export type LookId = 'teaser' | 'neon' | 'sunset' | 'aurora' | 'studio' | 'midnight' | 'graphite';
export const LOOKS: { id: LookId; name: string; note: string; tone: 'Colorful' | 'Low-key' }[] = [
  { id: 'teaser', name: 'Teaser', note: 'Blurred teaser behind the page · subtle white frame (default)', tone: 'Colorful' },
  { id: 'neon', name: 'Neon', note: 'Cobalt, violet, magenta · rainbow frame', tone: 'Colorful' },
  { id: 'sunset', name: 'Sunset', note: 'Orange into pink and plum · warm frame', tone: 'Colorful' },
  { id: 'aurora', name: 'Aurora', note: 'Teal and cobalt · subtle white frame', tone: 'Colorful' },
  { id: 'studio', name: 'Studio', note: 'Show cobalt · solid gold rim', tone: 'Low-key' },
  { id: 'midnight', name: 'Midnight', note: 'Soft violet glow · hairline frame', tone: 'Low-key' },
  { id: 'graphite', name: 'Graphite', note: 'Near-flat ink · thin canary line', tone: 'Low-key' },
];

/** The Weekend app download page. Prod keeps this in an environment setting
 *  (web-checkout APP_DOWNLOAD_URL) that is empty in the repo; set it here and
 *  the Mobile tile and the app banner both link to it. Null: show a prototype note. */
export const APP_DOWNLOAD_URL: string | null = null;

/** What the desktop tab shows; the real share link is a prototype URL. */
export const PLAY_DOMAIN = 'play.weekend.com';
