// ─────────────────────────────────────────────────────────────────────────
//  The onboarding, as a hub tile
//
//  The Weekend onboarding is its own prototype — Lightning 3 + Blits, built
//  for TV performance, living in packages/onboarding. It is not bundled into
//  this React app; the two deploy side by side and this tile is a link.
//
//  It sits in the hub so the flow is reachable after setup: someone who
//  skipped it, or who wants to run it again, launches it like any other title.
// ─────────────────────────────────────────────────────────────────────────
import type { Hub9Game } from './games9';

/** Tile id. `onLaunch` keys off this to hand off instead of faking a launch. */
export const ONBOARDING_ID = 'weekend-onboarding';

/**
 * Where the onboarding lives, relative to wherever the hub is served.
 *
 * On Pages both are published from one artifact — the hub at /<base>/ and the
 * onboarding at /<base>/onboarding/ — so a relative path resolves without the
 * app being told what the base is. In dev they are separate Vite servers.
 * ?onboarding=<url> overrides either.
 */
export function onboardingUrl(): string {
  const override = new URLSearchParams(window.location.search).get('onboarding');
  if (override) return override;
  if (import.meta.env.DEV) {
    return `${window.location.protocol}//${window.location.hostname}:5175/`;
  }
  // Keep any trailing directory, drop a trailing file (…/index.html).
  const path = window.location.pathname.replace(/[^/]*$/, '');
  return `${path}onboarding/`;
}

export const ONBOARDING_GAME: Hub9Game = {
  id: ONBOARDING_ID,
  title: 'Welcome to Weekend',
  description: 'Meet your host and set up your phone — the guided first-run flow.',
  longDescription:
    'The guided first-run experience: your host introduces Weekend, walks you through a warm-up question, pairs your phone as a buzzer and microphone, and sets up your plan. Built on Lightning for TV performance, and replayable any time.',
  players: 'Single Player',
  interaction: 'Voice Controlled',
  theme: {
    base: '#0a0322',
    from: '#180a3e',
    to: '#3a2a7a',
    accent: '#ffda0a',
    pattern: 'rays',
    logo: 'block',
    motif: '👋',
  },
};
