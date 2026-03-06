import { useEffect, useState } from 'react';
import type { NavigationDirection } from '@mobile-app-lab/shared';

// Layout constants (px at 1920x1080 reference)
// Focus frame targets the image positions (rows handle their own title above)
const GRID = {
  startX: 90,
  featuredY: 234,
  recentY: 678,
  gap: 64,
  featured: { width: 532, height: 237, count: 3 },
  recent: { width: 234, height: 234, count: 5 },
};

const FRAME_MARGIN = 0.5; // vw on each side

// Convert px to vw/vh at 1920x1080 reference
const pxToVw = (px: number) => (px / 1920) * 100;
const pxToVh = (px: number) => (px / 1080) * 100;

interface PlaylistFocusFrameProps {
  focusRow: number;
  focusCol: number;
  bounceDirection?: NavigationDirection | null;
  isPressing: boolean;
}

export function PlaylistFocusFrame({ focusRow, focusCol, bounceDirection, isPressing }: PlaylistFocusFrameProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const config = focusRow === 0 ? GRID.featured : GRID.recent;
  const rowY = focusRow === 0 ? GRID.featuredY : GRID.recentY;

  // Frame dimensions (image size + margin)
  const frameWidthVw = pxToVw(config.width) + FRAME_MARGIN * 2;
  const frameHeightVh = pxToVh(config.height) + FRAME_MARGIN * 2; // approximate using vw for margin

  // Frame position
  const itemX = GRID.startX + focusCol * (config.width + GRID.gap);
  const translateXVw = pxToVw(itemX) - FRAME_MARGIN;
  const translateYVh = pxToVh(rowY) - FRAME_MARGIN;

  // Bounce offset
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
          width: `${frameWidthVw}vw`,
          height: `${frameHeightVh}vh`,
          top: '0',
          left: '0',
          borderRadius: '14px',
          padding: '8px',
          background: 'linear-gradient(180deg, #FFE88B 0%, #F6D300 94.88%)',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude' as const,
          boxShadow: '0 0 40px rgba(255, 232, 139, 0.3)',
          transform: isAnimating
            ? `translate(${translateXVw + bounceOffset.x}vw, ${translateYVh + bounceOffset.y}vh)${isPressing ? ' scale(0.95)' : ''}`
            : `translate(${translateXVw}vw, ${translateYVh}vh)${isPressing ? ' scale(0.95)' : ''}`,
        }}
      />
    </div>
  );
}

// Export grid helpers for navigation logic in App.tsx
export { GRID };

export function getItemCenterX(row: number, col: number): number {
  const config = row === 0 ? GRID.featured : GRID.recent;
  return GRID.startX + col * (config.width + GRID.gap) + config.width / 2;
}

export function findClosestCol(currentRow: number, currentCol: number, targetRow: number): number {
  const currentCenterX = getItemCenterX(currentRow, currentCol);
  const targetConfig = targetRow === 0 ? GRID.featured : GRID.recent;
  let closestCol = 0;
  let minDist = Infinity;
  for (let i = 0; i < targetConfig.count; i++) {
    const dist = Math.abs(getItemCenterX(targetRow, i) - currentCenterX);
    if (dist < minDist) {
      minDist = dist;
      closestCol = i;
    }
  }
  return closestCol;
}
