import { useEffect, useState } from 'react';

interface FocusFrameProps {
  focusedIndex: number;
  bounceDirection?: 'left' | 'right' | 'up' | 'down' | null;
  isPressing: boolean;
}

// Keep these in sync with GameHub/GameTile.
const TILE_WIDTH = 20; // vw
const TILE_GAP = 2; // vw
const TILE_HEIGHT = (TILE_WIDTH * 9) / 16; // 16:9 aspect
const FRAME_MARGIN = 0.5; // vw margin on each side

export function FocusFrame({ focusedIndex, bounceDirection, isPressing }: FocusFrameProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  // Frame is positioned within the same row container as the tiles, so its
  // translateX only needs to account for the focused tile's offset in the row.
  const translateX = focusedIndex * (TILE_WIDTH + TILE_GAP);

  const getBounceOffset = () => {
    if (!bounceDirection) return { x: 0, y: 0 };
    switch (bounceDirection) {
      case 'left':
        return { x: -1.5, y: 0 };
      case 'right':
        return { x: 1.5, y: 0 };
      case 'up':
        return { x: 0, y: -1.5 };
      case 'down':
        return { x: 0, y: 1.5 };
      default:
        return { x: 0, y: 0 };
    }
  };

  const bounceOffset = getBounceOffset();

  useEffect(() => {
    if (bounceDirection) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 150);
      return () => clearTimeout(timer);
    }
  }, [bounceDirection]);

  return (
    <div
      className={`
        absolute pointer-events-none rounded-2xl ring-8 ring-blue-500 shadow-2xl shadow-blue-500/50
        ${isAnimating || isPressing ? 'transition-transform duration-150 ease-out' : 'transition-transform duration-300 ease-out'}
      `}
      style={{
        width: `${TILE_WIDTH + FRAME_MARGIN * 2}vw`,
        height: `${TILE_HEIGHT + FRAME_MARGIN * 2}vw`,
        top: `-${FRAME_MARGIN}vw`,
        left: `-${FRAME_MARGIN}vw`,
        transform: isAnimating
          ? `translateX(${translateX + bounceOffset.x}vw) translateY(${bounceOffset.y}vw)${isPressing ? ' scale(0.95)' : ''}`
          : `translateX(${translateX}vw)${isPressing ? ' scale(0.95)' : ''}`,
      }}
    />
  );
}
