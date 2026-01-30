import { useState, useCallback, useRef } from 'react';
import {
  NavigationInputPayload,
  NavigationDirection,
  NavigationAction,
  PLACEHOLDER_GAMES,
} from '@mobile-app-lab/shared';
import { GameHub } from './components/GameHub';
import { useSocket } from './hooks/useSocket';
import { soundManager } from './utils/sounds';

// Configuration: Enable/disable looping navigation
const ENABLE_LOOP_NAVIGATION = false;

function App() {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [bounceDirection, setBounceDirection] = useState<NavigationDirection | null>(null);
  const [isPressing, setIsPressing] = useState(false);
  const audioUnlockedRef = useRef(false);
  const games = PLACEHOLDER_GAMES;

  const handleNavigate = useCallback((direction: NavigationDirection) => {
    setFocusedIndex((current) => {
      let newIndex = current;
      let shouldBounce = false;

      switch (direction) {
        case 'left':
          if (ENABLE_LOOP_NAVIGATION) {
            // Loop to last item if at first item
            newIndex = current === 0 ? games.length - 1 : current - 1;
          } else {
            // Stop at first item
            if (current === 0) {
              shouldBounce = true;
            } else {
              newIndex = current - 1;
            }
          }
          break;
        case 'right':
          if (ENABLE_LOOP_NAVIGATION) {
            // Loop to first item if at last item
            newIndex = current === games.length - 1 ? 0 : current + 1;
          } else {
            // Stop at last item
            if (current === games.length - 1) {
              shouldBounce = true;
            } else {
              newIndex = current + 1;
            }
          }
          break;
        case 'up':
        case 'down':
          // No vertical navigation in single row, trigger bounce
          shouldBounce = true;
          break;
        default:
          break;
      }

      // Trigger bounce animation and sound if at boundary
      if (shouldBounce) {
        setBounceDirection(direction);
        setTimeout(() => setBounceDirection(null), 200);
        soundManager.playBounceSound();
      } else if (newIndex !== current) {
        // Play navigation sound only if focus actually moved
        soundManager.playNavigationSound();
      }

      return newIndex;
    });
  }, [games.length]);

  const handleAction = useCallback((action: NavigationAction) => {
    if (action === 'ok') {
      console.log(`[TV] Selected game: ${games[focusedIndex].title}`);

      // Trigger pressing animation
      setIsPressing(true);
      setTimeout(() => setIsPressing(false), 150);

      soundManager.playSelectionSound();
      // In the future, this could launch the game
    } else if (action === 'back') {
      console.log('[TV] Back action');
      // In the future, this could go back to main menu
    }
  }, [focusedIndex, games]);

  // Handle navigation input from mobile
  const handleNavigationInput = useCallback(
    (payload: NavigationInputPayload) => {
      // Unlock audio on first mobile input
      if (!audioUnlockedRef.current) {
        soundManager.unlockAudio();
        audioUnlockedRef.current = true;
      }

      if (payload.type === 'navigate' && payload.direction) {
        handleNavigate(payload.direction);
      } else if (payload.type === 'action' && payload.action) {
        handleAction(payload.action);
      }
    },
    [handleNavigate, handleAction]
  );

  const { roomCode, connectionStatus } = useSocket(handleNavigationInput);

  if (!connectionStatus.connected || !roomCode) {
    return (
      <div className="w-full h-full bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-pulse">📡</div>
          <h1 className="text-5xl font-bold mb-4">Connecting to Server...</h1>
          <p className="text-2xl text-gray-400">Please wait</p>
        </div>
      </div>
    );
  }

  return (
    <GameHub
      roomCode={roomCode}
      focusedIndex={focusedIndex}
      bounceDirection={bounceDirection}
      isPressing={isPressing}
      onNavigate={handleNavigate}
      onAction={handleAction}
      onFocusChange={setFocusedIndex}
    />
  );
}

export default App;
