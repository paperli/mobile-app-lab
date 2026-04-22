import { useEffect, useState } from 'react';
import {
  FOCUS_FRAME_INNER_STYLE,
  FOCUS_FRAME_OFFSET_PX,
  FOCUS_FRAME_OUTER_STYLE,
} from './focus';

interface FocusFrameProps {
  focusedIndex: number;
  bounceDirection?: 'left' | 'right' | 'up' | 'down' | null;
  isPressing: boolean;
}

// Keep in sync with GameHub/GameTile.
const TILE_WIDTH = 20; // vw
const TILE_GAP = 2; // vw
const TILE_HEIGHT = (TILE_WIDTH * 9) / 16; // 16:9 aspect

export function FocusFrame({ focusedIndex, bounceDirection, isPressing }: FocusFrameProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  // translateX positions the frame over the currently focused tile.
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

  const transitionClass =
    isAnimating || isPressing
      ? 'absolute transition-transform duration-150 ease-out'
      : 'absolute transition-transform duration-300 ease-out';

  return (
    <div
      className={transitionClass}
      style={{
        ...FOCUS_FRAME_OUTER_STYLE,
        // Outer edge of the frame sits FOCUS_FRAME_OFFSET_PX outside the tile
        // (= 12px visual gap + 8px stroke width).
        width: `calc(${TILE_WIDTH}vw + ${FOCUS_FRAME_OFFSET_PX * 2}px)`,
        height: `calc(${TILE_HEIGHT}vw + ${FOCUS_FRAME_OFFSET_PX * 2}px)`,
        top: `-${FOCUS_FRAME_OFFSET_PX}px`,
        left: `-${FOCUS_FRAME_OFFSET_PX}px`,
        transform: isAnimating
          ? `translateX(${translateX + bounceOffset.x}vw) translateY(${bounceOffset.y}vw)${isPressing ? ' scale(0.95)' : ''}`
          : `translateX(${translateX}vw)${isPressing ? ' scale(0.95)' : ''}`,
      }}
    >
      <div style={FOCUS_FRAME_INNER_STYLE} />
    </div>
  );
}
