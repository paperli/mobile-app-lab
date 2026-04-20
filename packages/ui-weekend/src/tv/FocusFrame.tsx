import { useEffect, useState } from 'react';

interface FocusFrameProps {
  focusedIndex: number;
  totalItems: number;
  bounceDirection?: 'left' | 'right' | 'up' | 'down' | null;
  isPressing: boolean;
}

export function FocusFrame({ focusedIndex, totalItems, bounceDirection, isPressing }: FocusFrameProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const tileWidth = 20;
  const gap = 2;
  const containerPadding = 4;
  const frameMargin = 0.5;
  const frameWidth = tileWidth + (frameMargin * 2);
  const tileHeight = tileWidth * (9 / 16);
  const frameHeight = tileHeight + (frameMargin * 2);
  const totalContentWidth = (tileWidth + gap) * totalItems - gap;
  const availableWidth = 100 - (containerPadding * 2);
  const centeringOffset = (availableWidth - totalContentWidth) / 2;
  const firstTileOffset = containerPadding + centeringOffset;
  const translateX = firstTileOffset + (tileWidth + gap) * focusedIndex - frameMargin;

  const getBounceOffset = () => {
    if (!bounceDirection) return { x: 0, y: 0 };
    switch (bounceDirection) {
      case 'left':  return { x: -1.5, y: 0 };
      case 'right': return { x: 1.5, y: 0 };
      case 'up':    return { x: 0, y: -1.5 };
      case 'down':  return { x: 0, y: 1.5 };
      default:      return { x: 0, y: 0 };
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
    <div className="absolute inset-0 pointer-events-none">
      <div
        className={`
          absolute
          rounded-2xl
          ring-8 ring-focus
          shadow-2xl shadow-focus/50
          ${isAnimating || isPressing ? 'transition-transform duration-150 ease-out' : 'transition-all duration-300 ease-out'}
        `}
        style={{
          width: `${frameWidth}vw`,
          height: `${frameHeight}vw`,
          bottom: `calc(4vh - ${frameMargin}vw)`,
          left: '0',
          transform: isAnimating
            ? `translateX(${translateX + bounceOffset.x}vw) translateY(${bounceOffset.y}vw)${isPressing ? ' scale(0.95)' : ''}`
            : `translateX(${translateX}vw)${isPressing ? ' scale(0.95)' : ''}`,
        }}
      />
    </div>
  );
}
