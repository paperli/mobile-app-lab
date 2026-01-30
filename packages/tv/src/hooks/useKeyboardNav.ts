import { useEffect, useCallback, useRef } from 'react';
import { NavigationDirection, NavigationAction } from '@mobile-app-lab/shared';
import { soundManager } from '../utils/sounds';

interface UseKeyboardNavProps {
  onNavigate: (direction: NavigationDirection) => void;
  onAction: (action: NavigationAction) => void;
}

export function useKeyboardNav({ onNavigate, onAction }: UseKeyboardNavProps) {
  const audioUnlockedRef = useRef(false);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Unlock audio on first keyboard interaction
      if (!audioUnlockedRef.current) {
        soundManager.unlockAudio();
        audioUnlockedRef.current = true;
      }

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          onNavigate('up');
          break;
        case 'ArrowDown':
          event.preventDefault();
          onNavigate('down');
          break;
        case 'ArrowLeft':
          event.preventDefault();
          onNavigate('left');
          break;
        case 'ArrowRight':
          event.preventDefault();
          onNavigate('right');
          break;
        case 'Enter':
        case 'Return':
          event.preventDefault();
          onAction('ok');
          break;
        case 'Escape':
          event.preventDefault();
          onAction('back');
          break;
      }
    },
    [onNavigate, onAction]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
