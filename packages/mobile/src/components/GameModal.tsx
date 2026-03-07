import { useState, useEffect } from 'react';
import { NavigationDirection, NavigationAction, TVScreen } from '@mobile-app-lab/shared';
import { useSwipeGestures } from '../hooks/useSwipeGestures';
import { HapticFeedback } from '../utils/haptics';
import padBackground from '../assets/pad_background_circular_3x.png';
import spinnerImage from '../assets/image_spinner.png';
import logoImage from '../assets/image_sq_logo.png';

interface GameModalProps {
  tvScreen: TVScreen;
  onNavigate: (direction: NavigationDirection) => void;
  onAction: (action: NavigationAction) => void;
}

const GRADIENT_BG = 'linear-gradient(169deg, #1E0D3A 16.15%, #5827B2 92.7%)';
const OK_RADIUS = 0.2;

function GameLoadingScreen() {
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center"
      style={{ background: GRADIENT_BG }}
    >
      <img
        src={logoImage}
        alt="Song Quiz"
        style={{ width: '308px', height: '223px', objectFit: 'contain' }}
      />

      {/* Spinner + Loading text */}
      <div className="flex flex-col items-center" style={{ marginTop: '54px' }}>
        <img
          src={spinnerImage}
          alt=""
          className="animate-spin"
          style={{
            width: '48px',
            height: '48px',
            animationDuration: '1.2s',
            animationTimingFunction: 'linear',
          }}
        />
        <div className="relative" style={{ marginTop: '16px', fontSize: '22px' }}>
          <span className="text-white font-bold">Loading</span>
          <span className="text-white font-bold absolute left-full top-0">
            {'.'.repeat(dotCount)}
          </span>
        </div>
      </div>
    </div>
  );
}

function GameDPad({ onNavigate, onAction }: Omit<GameModalProps, 'tvScreen'>) {
  const [lastSwipe, setLastSwipe] = useState<NavigationDirection | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleSwipe = (direction: NavigationDirection) => {
    setLastSwipe(direction);
    setShowFeedback(true);
    onNavigate(direction);
    setTimeout(() => setShowFeedback(false), 300);
  };

  const handleTapAt = (relX: number, relY: number) => {
    const cx = relX - 0.5;
    const cy = relY - 0.5;
    const dist = Math.sqrt(cx * cx + cy * cy);

    if (dist <= OK_RADIUS) {
      HapticFeedback.medium();
      onAction('ok');
      setShowFeedback(true);
      setLastSwipe(null);
      setTimeout(() => setShowFeedback(false), 300);
    } else {
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
    <div
      className="w-full h-full flex flex-col items-center justify-center px-2 pt-16"
      style={{ background: GRADIENT_BG }}
    >
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
            borderRadius: '64px',
          }}
        >
          {showFeedback && !lastSwipe && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-white/20 animate-ping"></div>
            </div>
          )}
        </div>
      </div>

      {/* Back button */}
      <button
        onTouchStart={(e) => {
          e.preventDefault();
          HapticFeedback.light();
          onAction('back');
        }}
        className="w-[120px] h-[120px] text-white transition-all duration-100 active:scale-95 select-none touch-none flex items-center justify-center"
        style={{
          borderRadius: '50%',
          border: '2px solid rgba(255, 255, 255, 0.12)',
          background: 'rgba(255, 255, 255, 0.06)',
        }}
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 14 4 9l5-5" />
          <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" />
        </svg>
      </button>
    </div>
  );
}

export function GameModal({ tvScreen, onNavigate, onAction }: GameModalProps) {
  const isLoading = tvScreen === 'loading';

  return (
    <div className="w-full h-full">
      {isLoading ? (
        <GameLoadingScreen />
      ) : (
        <GameDPad onNavigate={onNavigate} onAction={onAction} />
      )}
    </div>
  );
}
