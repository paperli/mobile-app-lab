import { useState } from 'react';
import { Undo2 } from 'lucide-react';
import { NavigationDirection, NavigationAction } from '@mobile-app-lab/shared';
import { useSwipeGestures } from '../hooks/useSwipeGestures';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { HapticFeedback } from '../utils/haptics';
import { VoiceGlow } from './VoiceGlow';
import padBackground from '../assets/pad_background_circular_3x.png';

interface SquareControllerProps {
  onNavigate: (direction: NavigationDirection) => void;
  onAction: (action: NavigationAction) => void;
}

export function SquareController({ onNavigate, onAction }: SquareControllerProps) {
  const [lastSwipe, setLastSwipe] = useState<NavigationDirection | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [edgePress, setEdgePress] = useState<NavigationDirection | null>(null);
  const [ripplePosition, setRipplePosition] = useState<{ x: number; y: number } | null>(null);

  // Voice input for visual feedback (wave animation)
  const { volume, isListening } = useVoiceInput({
    enabled: true,
    smoothingFactor: 0.85,
    testMode: false  // Now using HTTPS, real microphone enabled
  });

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

  const handleEdgeClick = (direction: NavigationDirection, e: React.TouchEvent) => {
    HapticFeedback.light();

    // Calculate ripple position relative to the container
    const touch = e.touches[0];
    const container = e.currentTarget.closest('.aspect-square');
    if (container) {
      const rect = container.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      setRipplePosition({ x, y });
    }

    setEdgePress(direction);
    onNavigate(direction);

    // Clear ripple after animation
    setTimeout(() => {
      setEdgePress(null);
      setRipplePosition(null);
    }, 300);
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
    <div className="relative flex flex-col items-center justify-center h-full px-2 pt-16" style={{ backgroundColor: '#00001f' }}>
      {/* Voice-activated wave effect */}
      <VoiceGlow volume={volume} isActive={isListening} />

      {/* Square Trackpad Area with Invisible Edge Zones */}
      <div className="relative w-full max-w-md aspect-square mb-16">
          <div
            className="relative w-full h-full overflow-hidden"
            style={{
              touchAction: 'none',
              backgroundImage: `url(${padBackground})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              borderRadius: '64px'
            }}
          >
            {/* Invisible Top Edge Zone */}
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleEdgeClick('up', e);
              }}
              className="absolute top-0 left-0 right-0 h-24 z-10 bg-transparent"
            />

            {/* Invisible Bottom Edge Zone */}
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleEdgeClick('down', e);
              }}
              className="absolute bottom-0 left-0 right-0 h-24 z-10 bg-transparent"
            />

            {/* Invisible Left Edge Zone */}
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleEdgeClick('left', e);
              }}
              className="absolute top-24 bottom-24 left-0 w-24 z-10 bg-transparent"
            />

            {/* Invisible Right Edge Zone */}
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleEdgeClick('right', e);
              }}
              className="absolute top-24 bottom-24 right-0 w-24 z-10 bg-transparent"
            />

            {/* Central Trackpad Area with swipe and tap */}
            <div
              ref={trackpadRef}
              className="absolute inset-24 z-0"
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

          {/* Ripple Overlay - Outside clipping context */}
          {edgePress && ripplePosition && (
            <div
              className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${ripplePosition.x}px`,
                top: `${ripplePosition.y}px`,
              }}
            >
              <div className="w-32 h-32 rounded-full bg-blue-500/30 animate-ping"></div>
            </div>
          )}
        </div>

        {/* Circular Back Button - 120x120px */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            HapticFeedback.light();
            onAction('back');
          }}
          className="
            w-[120px] h-[120px]
            text-white
            transition-all duration-100 active:scale-95
            select-none touch-none
            flex items-center justify-center
          "
          style={{
            borderRadius: '50%',
            border: '2px solid rgba(255, 255, 255, 0.12)',
            background: 'rgba(255, 255, 255, 0.06)',
          }}
        >
          <Undo2 size={48} strokeWidth={2.5} />
        </button>

    </div>
  );
}
