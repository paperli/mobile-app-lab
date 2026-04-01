import { useState } from 'react';
import { NavigationDirection, NavigationAction } from '@mobile-app-lab/shared';
import { useSwipeGestures } from '../hooks/useSwipeGestures';
import { HapticFeedback } from '../utils/haptics';

interface TrackpadControllerProps {
  onNavigate: (direction: NavigationDirection) => void;
  onAction: (action: NavigationAction) => void;
}

export function TrackpadController({ onNavigate, onAction }: TrackpadControllerProps) {
  const [lastSwipe, setLastSwipe] = useState<NavigationDirection | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleSwipe = (direction: NavigationDirection) => {
    setLastSwipe(direction);
    setShowFeedback(true);
    onNavigate(direction);

    // Clear feedback after animation
    setTimeout(() => setShowFeedback(false), 300);
  };

  const handleTap = () => {
    onAction('ok');
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 300);
  };

  const handleEdgeClick = (direction: NavigationDirection) => {
    HapticFeedback.light();
    onNavigate(direction);
  };

  const trackpadRef = useSwipeGestures({
    onSwipe: handleSwipe,
    onTap: handleTap,
    minSwipeDistance: 40,
    minVelocity: 0.2,
  });

  const getArrowPosition = () => {
    if (!lastSwipe || !showFeedback) return 'opacity-0';

    const positions = {
      up: 'top-1/4 left-1/2 -translate-x-1/2',
      down: 'bottom-1/4 left-1/2 -translate-x-1/2',
      left: 'left-1/4 top-1/2 -translate-y-1/2',
      right: 'right-1/4 top-1/2 -translate-y-1/2',
    };

    return positions[lastSwipe];
  };

  const getArrowIcon = () => {
    if (!lastSwipe) return '';

    const icons = {
      up: '▲',
      down: '▼',
      left: '◀',
      right: '▶',
    };

    return icons[lastSwipe];
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-900 p-8">
      {/* Trackpad Area with Invisible Edge Zones */}
      <div className="relative flex-1 w-full max-w-2xl mb-8">
        <div
          className="relative w-full h-full bg-gray-800 rounded-3xl border-4 border-gray-700 overflow-hidden"
          style={{
            touchAction: 'none',
            backgroundImage: 'radial-gradient(circle, rgba(156, 163, 175, 0.15) 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px'
          }}
        >
          {/* Invisible Top Edge Zone */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleEdgeClick('up');
            }}
            className="absolute top-0 left-0 right-0 h-16 z-10 bg-transparent"
          />

          {/* Invisible Bottom Edge Zone */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleEdgeClick('down');
            }}
            className="absolute bottom-0 left-0 right-0 h-16 z-10 bg-transparent"
          />

          {/* Invisible Left Edge Zone */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleEdgeClick('left');
            }}
            className="absolute top-16 bottom-16 left-0 w-16 z-10 bg-transparent"
          />

          {/* Invisible Right Edge Zone */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleEdgeClick('right');
            }}
            className="absolute top-16 bottom-16 right-0 w-16 z-10 bg-transparent"
          />

          {/* Central Trackpad Area with swipe and tap */}
          <div
            ref={trackpadRef}
            className="absolute inset-16 z-0"
          >
            {/* Swipe Feedback */}
            <div
              className={`
                absolute text-8xl text-blue-400 transition-all duration-300
                ${showFeedback ? 'scale-150 opacity-100' : 'scale-100 opacity-0'}
                ${getArrowPosition()}
              `}
            >
              {getArrowIcon()}
            </div>

            {/* Tap Feedback (center pulse) */}
            {showFeedback && !lastSwipe && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-blue-500/30 animate-ping"></div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
