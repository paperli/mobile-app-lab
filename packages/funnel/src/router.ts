// Hash routes (#ad, #<game-id>, #signup, #signin, #payment, #play, #looks), so the
// build runs on any static host. A route may carry a query: #signin?next=hub.
import { useSyncExternalStore } from 'react';
import { isGameId } from './config';
import { findAccount, getGame, getSession, isMobile, saveAccount, setSession } from './state';

export type RouteName = 'ad' | 'landing' | 'signup' | 'signin' | 'payment' | 'play' | 'looks' | 'demo';

export interface Route {
  name: RouteName;
  params: URLSearchParams;
}

function parse(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const params = new URLSearchParams(query);
  const known: RouteName[] = ['ad', 'signup', 'signin', 'payment', 'play', 'looks', 'demo'];
  const name: RouteName = path === '' ? 'ad' : known.includes(path as RouteName) ? (path as RouteName) : 'landing';
  // A game's landing page is #<game-id>; any route can also carry ?game=<id>.
  // Either one makes that game the current one.
  const game = name === 'landing' && isGameId(path) ? path : params.get('game');
  if (isGameId(game) && getSession().game !== game) setSession({ game });
  return { name, params };
}

let current = parse(location.hash);
const listeners = new Set<() => void>();
window.addEventListener('hashchange', () => {
  current = parse(location.hash);
  listeners.forEach((l) => l());
  window.scrollTo(0, 0);
});

export function useRoute(): Route {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current
  );
}

/** `to` is a hash path such as 'signin?next=hub'. */
export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const hash = '#' + to;
  if (opts.replace) {
    location.replace(location.pathname + location.search + hash);
  } else {
    location.hash = hash;
  }
}

/** The current game's landing page route. */
export const landing = () => getGame().id;

// ── Hub ────────────────────────────────────────────────────────────────────
// In the demo build the hub sits one level up (/ and /funnel/). In dev it is
// the TV package's Vite server. ?hub=<url> overrides both.
export function hubUrl(kind: 'desktop' | 'tv'): string {
  const view = kind === 'desktop' ? 'hub-desktop' : 'hub';
  const user = getSession().user;
  const email = kind === 'desktop' && user ? `&email=${encodeURIComponent(user)}` : '';
  const query = `?view=${view}&game=${getGame().hubId}&subscribed=true&onboardingRow=false${email}`;
  const override = new URLSearchParams(location.search).get('hub');
  if (override) return override + query;
  if (import.meta.env.DEV) return `${location.protocol}//${location.hostname}:5173/pages/index.html${query}`;
  return new URL('../' + query, location.href).toString();
}

/** The link the Desktop tab shares: opens sign-in on a computer, then the hub. */
export function shareUrl(): string {
  const url = new URL(location.href);
  url.search = '?device=desktop';
  url.hash = `signin?next=hub&game=${getGame().id}`;
  return url.toString();
}

// ── Flow rules ─────────────────────────────────────────────────────────────

/** A subscribed user is done with checkout: mobile → play steps, desktop → hub. */
export function finishSubscribed(opts: { welcome?: boolean; toHub?: boolean } = {}) {
  if (opts.toHub || !isMobile()) {
    location.replace(hubUrl('desktop'));
    return;
  }
  if (opts.welcome) {
    setSession({ welcome: true });
    navigate(landing(), { replace: true });
  } else {
    navigate('play', { replace: true });
  }
}

/** Post-auth routing, the same for sign-up, sign-in and the header link. */
export function afterAuth(email: string, next: string | null) {
  const acct = findAccount(email) ?? { subscribed: false };
  // The shared desktop link only ever reaches subscribers.
  if (next === 'hub' && !acct.subscribed) saveAccount(email, { subscribed: true });
  const subscribed = next === 'hub' ? true : acct.subscribed;
  setSession({ user: email.trim().toLowerCase(), email, subscribed });
  if (subscribed) finishSubscribed({ toHub: next === 'hub' });
  else navigate('payment', { replace: true });
}

/** Guard target meaning "leave for the desktop hub". */
export const HUB = '@hub';

/** Route guards: no skipping ahead without a session, no going back to checkout. */
export function guard(route: Route): string | null {
  const s = getSession();
  switch (route.name) {
    case 'signup':
    case 'signin':
      if (s.subscribed && s.user && route.params.get('next') !== 'hub') return isMobile() ? 'play' : HUB;
      return null;
    case 'payment':
      if (!s.user) return landing();
      if (s.subscribed) return isMobile() ? 'play' : HUB;
      return null;
    case 'play':
      return s.subscribed ? null : landing();
    default:
      return null;
  }
}
