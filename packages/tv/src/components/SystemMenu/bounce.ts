import type { NavigationDirection } from '@mobile-app-lab/shared';

// Small translate applied to the focused element when the user presses an
// invalid direction — matches the GameHub focus frame bounce.
const BOUNCE_OFFSET_VW = 1.5;

export function bounceTransform(direction: NavigationDirection | null): string {
  if (!direction) return '';
  switch (direction) {
    case 'left':
      return `translateX(-${BOUNCE_OFFSET_VW}vw)`;
    case 'right':
      return `translateX(${BOUNCE_OFFSET_VW}vw)`;
    case 'up':
      return `translateY(-${BOUNCE_OFFSET_VW}vw)`;
    case 'down':
      return `translateY(${BOUNCE_OFFSET_VW}vw)`;
  }
}

export const bounceTransition = 'transform 150ms ease-out';
