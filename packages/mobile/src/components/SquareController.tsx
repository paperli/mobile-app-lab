import { useState, useEffect } from 'react';
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
  onVolumeChange?: (volume: number) => void;
}

export function SquareController({ onNavigate, onAction, onVolumeChange }: SquareControllerProps) {
  const [lastSwipe, setLastSwipe] = useState<NavigationDirection | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  // Voice input for visual feedback (wave animation)
  const { volume, isListening } = useVoiceInput({
    enabled: true,
    smoothingFactor: 0.85,
    testMode: false  // Now using HTTPS, real microphone enabled
  });

  // Report volume to parent
  useEffect(() => {
    if (onVolumeChange) onVolumeChange(volume);
  }, [volume, onVolumeChange]);

  // OK button radius as fraction of pad size (160px / ~400px pad ≈ 0.4 diameter → 0.2 radius)
  const OK_RADIUS = 0.2;

  const handleSwipe = (direction: NavigationDirection) => {
    setLastSwipe(direction);
    setShowFeedback(true);
    onNavigate(direction);
    setTimeout(() => setShowFeedback(false), 300);
  };

  const handleTapAt = (relX: number, relY: number) => {
    // Convert to centered coordinates (-0.5 to 0.5)
    const cx = relX - 0.5;
    const cy = relY - 0.5;
    const dist = Math.sqrt(cx * cx + cy * cy);

    if (dist <= OK_RADIUS) {
      // Center circle → OK
      HapticFeedback.medium();
      onAction('ok');
      setShowFeedback(true);
      setLastSwipe(null);
      setTimeout(() => setShowFeedback(false), 300);
    } else {
      // Outside circle → direction based on angle
      HapticFeedback.light();
      const angle = Math.atan2(cy, cx);
      let direction: NavigationDirection;
      if (angle > -Math.PI / 4 && angle <= Math.PI / 4) {
        direction = 'right';
      } else if (angle > Math.PI / 4 && angle <= (3 * Math.PI) / 4) {
        direction = 'down';
      } else if (angle > -(3 * Math.PI) / 4 && angle <= -Math.PI / 4) {
        direction = 'up';
      } else {
        direction = 'left';
      }
      setLastSwipe(direction);
      setShowFeedback(true);
      onNavigate(direction);
      setTimeout(() => setShowFeedback(false), 300);
    }
  };

  const trackpadRef = useSwipeGestures({
    onSwipe: handleSwipe,
    onTap: () => {},
    minSwipeDistance: 40,
    minVelocity: 0.2,
    onTapAt: handleTapAt,
  });

  return (
    <div className="relative flex flex-col items-center justify-center h-full px-2 pt-16" style={{ backgroundColor: 'transparent' }}>
      {/* Voice-activated wave effect */}
      <VoiceGlow volume={volume} isActive={isListening} />

      {/* Circular Pad Area */}
      <div className="relative w-full max-w-md aspect-square mb-16">
          <div
            ref={trackpadRef}
            className="relative w-full h-full"
            style={{
              touchAction: 'none',
              backgroundImage: `url(${padBackground})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              borderRadius: '64px'
            }}
          >
            {/* Tap Feedback (center pulse) */}
            {showFeedback && !lastSwipe && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-blue-500/30 animate-ping"></div>
              </div>
            )}
          </div>
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
