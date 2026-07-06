import { useState, useEffect, useRef, useCallback } from 'react';
import { NavigationDirection, NavigationAction, TVScreen } from '@mobile-app-lab/shared';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { HapticFeedback } from '../utils/haptics';
import { VoiceGlow } from './VoiceGlow';
import padBackground from '../assets/pad_background_circular_3x.png';

interface SquareControllerProps {
  onNavigate: (direction: NavigationDirection) => void;
  onAction: (action: NavigationAction) => void;
  onVolumeChange?: (volume: number) => void;
  tvScreen?: TVScreen;
}

// OK button radius as fraction of pad size (center circle = OK, ring = d-pad).
const OK_RADIUS = 0.2;
// Turbo: hold a direction to repeat. First repeat fires after HOLD_DELAY, then
// every REPEAT_INTERVAL until release.
const HOLD_DELAY_MS = 350;
const REPEAT_INTERVAL_MS = 140;

type Zone = NavigationDirection | 'ok';

function classifyZone(relX: number, relY: number): Zone {
  const cx = relX - 0.5;
  const cy = relY - 0.5;
  if (Math.sqrt(cx * cx + cy * cy) <= OK_RADIUS) return 'ok';
  const angle = Math.atan2(cy, cx);
  if (angle > -Math.PI / 4 && angle <= Math.PI / 4) return 'right';
  if (angle > Math.PI / 4 && angle <= (3 * Math.PI) / 4) return 'down';
  if (angle > -(3 * Math.PI) / 4 && angle <= -Math.PI / 4) return 'up';
  return 'left';
}

export function SquareController({ onNavigate, onAction, onVolumeChange, tvScreen = 'hub' }: SquareControllerProps) {
  const [lastDir, setLastDir] = useState<NavigationDirection | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  // Voice input for visual feedback (wave animation)
  const { volume, isListening } = useVoiceInput({
    enabled: true,
    smoothingFactor: 0.85,
    testMode: false, // Now using HTTPS, real microphone enabled
  });

  useEffect(() => {
    if (onVolumeChange) onVolumeChange(volume);
  }, [volume, onVolumeChange]);

  const padRef = useRef<HTMLDivElement>(null);
  // Turbo bookkeeping — kept in refs so timers see the latest direction.
  const dirRef = useRef<NavigationDirection | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const onNavigateRef = useRef(onNavigate);
  const onActionRef = useRef(onAction);
  useEffect(() => { onNavigateRef.current = onNavigate; }, [onNavigate]);
  useEffect(() => { onActionRef.current = onAction; }, [onAction]);

  const stopTurbo = useCallback(() => {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
    if (repeatTimer.current) { clearInterval(repeatTimer.current); repeatTimer.current = null; }
    dirRef.current = null;
  }, []);

  // Press in a directional zone: fire once, then start the turbo repeat.
  const beginDirection = useCallback((dir: NavigationDirection) => {
    dirRef.current = dir;
    setLastDir(dir);
    setShowFeedback(true);
    HapticFeedback.light();
    onNavigateRef.current(dir);
    holdTimer.current = setTimeout(() => {
      repeatTimer.current = setInterval(() => {
        if (dirRef.current) onNavigateRef.current(dirRef.current);
      }, REPEAT_INTERVAL_MS);
    }, HOLD_DELAY_MS);
  }, []);

  useEffect(() => {
    const el = padRef.current;
    if (!el) return;

    const relAt = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      return { x: (clientX - rect.left) / rect.width, y: (clientY - rect.top) / rect.height };
    };

    const onStart = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      const { x, y } = relAt(t.clientX, t.clientY);
      const zone = classifyZone(x, y);
      if (zone === 'ok') {
        HapticFeedback.medium();
        setLastDir(null);
        setShowFeedback(true);
        onActionRef.current('ok');
      } else {
        beginDirection(zone);
      }
    };

    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      // While holding, sliding into a different directional zone retargets the
      // turbo; the OK center is ignored so a slight drift keeps repeating.
      if (!dirRef.current) return;
      const t = e.touches[0];
      const { x, y } = relAt(t.clientX, t.clientY);
      const zone = classifyZone(x, y);
      if (zone !== 'ok' && zone !== dirRef.current) {
        dirRef.current = zone;
        setLastDir(zone);
      }
    };

    const onEnd = (e: TouchEvent) => {
      e.preventDefault();
      stopTurbo();
      setShowFeedback(false);
    };

    el.addEventListener('touchstart', onStart, { passive: false });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: false });
    el.addEventListener('touchcancel', onEnd, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
      stopTurbo();
    };
  }, [beginDirection, stopTurbo]);

  return (
    <div className="relative flex flex-col items-center justify-center h-full px-2" style={{ backgroundColor: 'transparent' }}>
      {/* Voice-activated wave effect */}
      <VoiceGlow volume={volume} isActive={isListening} tvScreen={tvScreen} />

      {/* Circular Pad Area */}
      <div className="relative" style={{ width: '332px', height: '332px' }}>
        <div
          ref={padRef}
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
          {/* Tap Feedback (center pulse) — OK presses only */}
          {showFeedback && !lastDir && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-blue-500/30 animate-ping"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
