// Prototype state: a session (sessionStorage) and a mock account list
// (localStorage). Prod has no "does this email have an account?" endpoint;
// the account list stands in for one.
import { useSyncExternalStore } from 'react';
import { DEFAULT_GAME, GAMES, LOOKS, isGameId, type FunnelGame, type LookId, type OfferId } from './config';

export interface Account {
  subscribed: boolean;
}

export interface Session {
  /** Email typed on the landing page, carried into auth. */
  email: string;
  /** Signed-in account email, once auth succeeds. */
  user: string | null;
  subscribed: boolean;
  /** Where the visit came from (?src=tiktok). */
  src: string | null;
  /** Show the one-time welcome toast on the landing page. */
  welcome: boolean;
  device: 'auto' | 'mobile' | 'desktop';
  offer: OfferId;
  look: LookId;
  /** The game this visit is about (landing page, ad, play page, hub hand-off). */
  game: string;
  /** Where the mobile-app banner sits on the landing page (prototype A/B). */
  appBanner: 'cta' | 'about';
}

/** Demo accounts, always present. */
export const SEED_ACCOUNTS: Record<string, Account> = {
  'player@weekend.com': { subscribed: false },
  'fan@weekend.com': { subscribed: true },
};

// v3: the Teaser look became the default; older sessions restart on it.
const SESSION_KEY = 'funnel.session.v3';
const ACCOUNTS_KEY = 'funnel.accounts';

const DEFAULT_SESSION: Session = {
  email: '',
  user: null,
  subscribed: false,
  src: null,
  welcome: false,
  device: 'auto',
  offer: 'social',
  look: 'teaser',
  game: DEFAULT_GAME,
  appBanner: 'cta',
};

function read<T>(store: () => Storage, key: string, fallback: T): T {
  try {
    const raw = store().getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}
function write(store: () => Storage, key: string, value: unknown) {
  try {
    store().setItem(key, JSON.stringify(value));
  } catch {
    /* private mode — the prototype still works for this page view */
  }
}

let session: Session = read(() => sessionStorage, SESSION_KEY, DEFAULT_SESSION);
let accounts: Record<string, Account> = read(() => localStorage, ACCOUNTS_KEY, {});
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// URL overrides: ?src=tiktok and ?device=mobile|desktop stick for the session.
{
  const q = new URLSearchParams(location.search);
  const src = q.get('src');
  const device = q.get('device');
  if (src) session = { ...session, src };
  const look = q.get('look');
  if (look && window.self === window.top && LOOKS.some((l) => l.id === look)) session = { ...session, look: look as LookId };
  if (device === 'mobile' || device === 'desktop' || device === 'auto') session = { ...session, device };
  write(() => sessionStorage, SESSION_KEY, session);
}

export function getSession() {
  return session;
}
export function setSession(patch: Partial<Session>) {
  session = { ...session, ...patch };
  write(() => sessionStorage, SESSION_KEY, session);
  emit();
}
export function resetSession() {
  session = { ...DEFAULT_SESSION, device: session.device, offer: session.offer, look: session.look, src: session.src };
  write(() => sessionStorage, SESSION_KEY, session);
  emit();
}
export function useSession() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => session
  );
}

export function getGame(): FunnelGame {
  return GAMES[isGameId(session.game) ? session.game : DEFAULT_GAME];
}
export function useGame(): FunnelGame {
  const s = useSession();
  return GAMES[isGameId(s.game) ? s.game : DEFAULT_GAME];
}

/** True inside the #looks comparison frames. */
export const IN_FRAME = window.self !== window.top;

/** Inside a comparison frame ?look= wins; top-level it was copied into the session on load. */
export function useLook(): LookId {
  const s = useSession();
  const q = IN_FRAME ? new URLSearchParams(location.search).get('look') : null;
  return LOOKS.some((l) => l.id === q) ? (q as LookId) : s.look;
}

const norm = (e: string) => e.trim().toLowerCase();

export function findAccount(email: string): Account | null {
  const e = norm(email);
  return accounts[e] ?? SEED_ACCOUNTS[e] ?? null;
}
export function saveAccount(email: string, acct: Account) {
  accounts = { ...accounts, [norm(email)]: acct };
  write(() => localStorage, ACCOUNTS_KEY, accounts);
}
export function clearAccounts() {
  accounts = {};
  write(() => localStorage, ACCOUNTS_KEY, accounts);
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Phones and narrow windows count as mobile; ?device= overrides. */
export function isMobile(s: Session = session): boolean {
  if (s.device !== 'auto') return s.device === 'mobile';
  return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 960;
}
