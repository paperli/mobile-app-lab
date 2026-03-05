import { useEffect, useState } from 'react';

interface GameMenuFocusFrameProps {
  focusedIndex: number;
  bounceDirection?: 'left' | 'right' | 'up' | 'down' | null;
  isPressing: boolean;
}

export function GameMenuFocusFrame({ focusedIndex, bounceDirection, isPressing }: GameMenuFocusFrameProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  // Layout math for 2 menu items (362x375 at 1920x1080)
  const itemWidth = 18.85; // vw (362/1920 * 100)
  const gap = 2.08; // vw (40/1920 * 100)
  const topOffset = 52.22; // vh (564/1080 * 100)
  const frameMargin = 0.5; // vw on each side

  const frameWidth = itemWidth + frameMargin * 2;

  // Center two items horizontally
  const totalContentWidth = itemWidth * 2 + gap; // 39.78vw
  const firstItemOffset = (100 - totalContentWidth) / 2; // 30.11vw

  const translateX = firstItemOffset + (itemWidth + gap) * focusedIndex - frameMargin;

  // Bounce offset (same logic as FocusFrame)
  const getBounceOffset = () => {
    if (!bounceDirection) return { x: 0, y: 0 };
    switch (bounceDirection) {
      case 'left': return { x: -1.5, y: 0 };
      case 'right': return { x: 1.5, y: 0 };
      case 'up': return { x: 0, y: -1.5 };
      case 'down': return { x: 0, y: 1.5 };
      default: return { x: 0, y: 0 };
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
        className={
          isAnimating || isPressing
            ? 'absolute transition-transform duration-150 ease-out'
            : 'absolute transition-all duration-300 ease-out'
        }
        style={{
          width: `${frameWidth}vw`,
          height: `calc(34.72vh + ${frameMargin * 2}vw)`,
          top: `calc(${topOffset}vh - ${frameMargin}vw)`,
          left: '0',
          borderRadius: '24px',
          border: '9px solid #FFE88B',
          boxShadow: '0 0 40px rgba(255, 232, 139, 0.3)',
          transform: isAnimating
            ? `translateX(${translateX + bounceOffset.x}vw) translateY(${bounceOffset.y}vw)${isPressing ? ' scale(0.95)' : ''}`
            : `translateX(${translateX}vw)${isPressing ? ' scale(0.95)' : ''}`,
        }}
      />
    </div>
  );
}
