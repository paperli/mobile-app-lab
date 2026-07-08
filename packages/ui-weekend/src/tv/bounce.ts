export type BounceDirection = 'left' | 'right' | 'up' | 'down';

const BOUNCE_OFFSET_VW = 1.5;

export const BOUNCE_DURATION_MS = 150;

export function bounceTransform(direction: BounceDirection | null): string {
  if (!direction) return 'none';
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
