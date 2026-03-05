import { useState, useCallback, useRef, useEffect } from 'react';
import {
  NavigationInputPayload,
  NavigationDirection,
  NavigationAction,
  PLACEHOLDER_GAMES,
} from '@mobile-app-lab/shared';
import { GameHub } from './components/GameHub';
import { LoadingScreen } from './components/song-quiz/LoadingScreen';
import { GameMenu } from './components/song-quiz/GameMenu';
import { useSocket } from './hooks/useSocket';
import { useKeyboardNav } from './hooks/useKeyboardNav';
import { soundManager } from './utils/sounds';

type AppScreen = 'hub' | 'loading' | 'game-menu';

// Configuration
const ENABLE_LOOP_NAVIGATION = false;
const LOADING_DURATION_MS = 2000; // Adjustable loading time
const MENU_ITEM_COUNT = 2; // Single Player + Party Mode

function App() {
  // Screen state
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('hub');

  // Hub state
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [bounceDirection, setBounceDirection] = useState<NavigationDirection | null>(null);
  const [isPressing, setIsPressing] = useState(false);

  // Game menu state
  const [menuFocusedIndex, setMenuFocusedIndex] = useState(0);
  const [menuBounceDirection, setMenuBounceDirection] = useState<NavigationDirection | null>(null);
  const [menuIsPressing, setMenuIsPressing] = useState(false);

  const audioUnlockedRef = useRef(false);
  const games = PLACEHOLDER_GAMES;

  // Loading → game-menu timer
  useEffect(() => {
    if (currentScreen === 'loading') {
      const timer = setTimeout(() => setCurrentScreen('game-menu'), LOADING_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [currentScreen]);

  const handleNavigate = useCallback((direction: NavigationDirection) => {
    if (currentScreen === 'hub') {
      setFocusedIndex((current) => {
        let newIndex = current;
        let shouldBounce = false;

        switch (direction) {
          case 'left':
            if (ENABLE_LOOP_NAVIGATION) {
              newIndex = current === 0 ? games.length - 1 : current - 1;
            } else {
              if (current === 0) shouldBounce = true;
              else newIndex = current - 1;
            }
            break;
          case 'right':
            if (ENABLE_LOOP_NAVIGATION) {
              newIndex = current === games.length - 1 ? 0 : current + 1;
            } else {
              if (current === games.length - 1) shouldBounce = true;
              else newIndex = current + 1;
            }
            break;
          case 'up':
          case 'down':
            shouldBounce = true;
            break;
        }

        if (shouldBounce) {
          setBounceDirection(direction);
          setTimeout(() => setBounceDirection(null), 200);
          soundManager.playBounceSound();
        } else if (newIndex !== current) {
          soundManager.playNavigationSound();
        }

        return newIndex;
      });
    } else if (currentScreen === 'game-menu') {
      setMenuFocusedIndex((current) => {
        let newIndex = current;
        let shouldBounce = false;

        switch (direction) {
          case 'left':
            if (current === 0) shouldBounce = true;
            else newIndex = current - 1;
            break;
          case 'right':
            if (current === MENU_ITEM_COUNT - 1) shouldBounce = true;
            else newIndex = current + 1;
            break;
          case 'up':
          case 'down':
            shouldBounce = true;
            break;
        }

        if (shouldBounce) {
          setMenuBounceDirection(direction);
          setTimeout(() => setMenuBounceDirection(null), 200);
          soundManager.playBounceSound();
        } else if (newIndex !== current) {
          soundManager.playNavigationSound();
        }

        return newIndex;
      });
    }
  }, [currentScreen, games.length]);

  const handleAction = useCallback((action: NavigationAction) => {
    if (currentScreen === 'hub') {
      if (action === 'ok') {
        const selectedGame = games[focusedIndex];
        setIsPressing(true);
        setTimeout(() => setIsPressing(false), 150);
        soundManager.playSelectionSound();

        // Launch Song Quiz
        if (selectedGame.id === 'game-1') {
          setTimeout(() => setCurrentScreen('loading'), 150);
        }
      }
    } else if (currentScreen === 'game-menu') {
      if (action === 'ok') {
        setMenuIsPressing(true);
        setTimeout(() => setMenuIsPressing(false), 150);
        soundManager.playSelectionSound();
        // TODO: launch actual game mode
      } else if (action === 'back') {
        setCurrentScreen('hub');
        setMenuFocusedIndex(0);
        setMenuBounceDirection(null);
      }
    }
  }, [currentScreen, focusedIndex, games]);

  // Handle navigation input from mobile
  const handleNavigationInput = useCallback(
    (payload: NavigationInputPayload) => {
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

  // Keyboard nav at app level (works on all screens)
  useKeyboardNav({ onNavigate: handleNavigate, onAction: handleAction });

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

  if (currentScreen === 'loading') {
    return <LoadingScreen />;
  }

  if (currentScreen === 'game-menu') {
    return (
      <GameMenu
        focusedIndex={menuFocusedIndex}
        bounceDirection={menuBounceDirection}
        isPressing={menuIsPressing}
      />
    );
  }

  return (
    <GameHub
      roomCode={roomCode}
      focusedIndex={focusedIndex}
      bounceDirection={bounceDirection}
      isPressing={isPressing}
      onFocusChange={setFocusedIndex}
    />
  );
}

export default App;
