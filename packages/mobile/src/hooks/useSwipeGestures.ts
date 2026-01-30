import { useRef, useCallback, useEffect } from 'react';
import { NavigationDirection } from '@mobile-app-lab/shared';
import { HapticFeedback } from '../utils/haptics';

interface SwipeConfig {
  minSwipeDistance?: number;
  minVelocity?: number;
}

interface UseSwipeGesturesProps extends SwipeConfig {
  onSwipe: (direction: NavigationDirection) => void;
  onTap: () => void;
}

export function useSwipeGestures({
  onSwipe,
  onTap,
  minSwipeDistance = 50,
  minVelocity = 0.3,
}: UseSwipeGesturesProps) {
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();

      if (!touchStart.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStart.current.x;
      const deltaY = touch.clientY - touchStart.current.y;
      const deltaTime = Date.now() - touchStart.current.time;

      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const velocity = distance / deltaTime;

      // Check if it's a tap (small movement, quick time)
      if (distance < 10 && deltaTime < 200) {
        // Haptic feedback for tap (OK action)
        HapticFeedback.medium();
        onTap();
        touchStart.current = null;
        return;
      }

      // Check if it meets swipe threshold
      if (distance < minSwipeDistance || velocity < minVelocity) {
        touchStart.current = null;
        return;
      }

      // Determine swipe direction
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      let direction: NavigationDirection;

      if (absX > absY) {
        // Horizontal swipe
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        // Vertical swipe
        direction = deltaY > 0 ? 'down' : 'up';
      }

      onSwipe(direction);
      touchStart.current = null;

      // Haptic feedback for swipe navigation
      HapticFeedback.navigation();
    },
    [onSwipe, onTap, minSwipeDistance, minVelocity]
  );

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchmove', handleTouchMove);
    };
  }, [handleTouchStart, handleTouchEnd, handleTouchMove]);

  return elementRef;
}
