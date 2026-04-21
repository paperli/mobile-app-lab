import { useState, useCallback, useRef, useEffect } from 'react';
import {
  NavigationInputPayload,
  NavigationDirection,
  NavigationAction,
  PLACEHOLDER_GAMES,
  SOCKET_EVENTS,
  TVScreen,
} from '@mobile-app-lab/shared';
import { GameHub } from './components/GameHub';
import { LoadingScreen } from './components/song-quiz/LoadingScreen';
import { GameMenu } from './components/song-quiz/GameMenu';
import { PlaylistSelect } from './components/song-quiz/PlaylistSelect';
import { InGameStub } from './components/song-quiz/InGameStub';
import { GRID, findClosestCol } from './components/song-quiz/PlaylistFocusFrame';
import { useSocket } from './hooks/useSocket';
import { useKeyboardNav } from './hooks/useKeyboardNav';
import { soundManager } from './utils/sounds';
import {
  SystemMenu,
  getExitGameActions,
  type SystemMenuState,
  type SystemMenuTab,
} from './components/SystemMenu';

type AppScreen = 'hub' | 'loading' | 'game-menu' | 'playlist-select' | 'in-game';

// Configuration
const ENABLE_LOOP_NAVIGATION = false;
const LOADING_DURATION_MS = 5000; // Adjustable loading time
const MENU_ITEM_COUNT = 2; // Single Player + Party Mode

// Map AppScreen → TVScreen (shared type) for SCREEN_UPDATE + System Menu context
const APP_TO_TV_SCREEN: Record<AppScreen, TVScreen> = {
  hub: 'hub',
  loading: 'loading',
  'game-menu': 'game-menu',
  'playlist-select': 'playlist-select',
  'in-game': 'in-game',
};

// Screens that are "boundaries": pressing back opens the System Menu
// instead of navigating up one step.
const BOUNDARY_SCREENS: ReadonlySet<AppScreen> = new Set(['hub', 'game-menu', 'in-game']);

const INITIAL_MENU_STATE: SystemMenuState = {
  open: false,
  tab: 'resume',
  layer: 'tabs',
  contentIndex: 0,
  bounce: null,
};

const BOUNCE_DURATION_MS = 200;

function App() {
  // Screen state
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('hub');
  const [activeGameId, setActiveGameId] = useState<string | undefined>(undefined);

  // System Menu state
  const [menuState, setMenuState] = useState<SystemMenuState>(INITIAL_MENU_STATE);
  const menuStateRef = useRef(menuState);
  const bounceTimeoutRef = useRef<number | null>(null);
  useEffect(() => {
    menuStateRef.current = menuState;
  }, [menuState]);

  // Hub state
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [bounceDirection, setBounceDirection] = useState<NavigationDirection | null>(null);
  const [isPressing, setIsPressing] = useState(false);

  // Game menu state
  const [menuFocusedIndex, setMenuFocusedIndex] = useState(0);
  const [menuBounceDirection, setMenuBounceDirection] = useState<NavigationDirection | null>(null);
  const [menuIsPressing, setMenuIsPressing] = useState(false);

  // Playlist select state
  const [playlistFocusRow, setPlaylistFocusRow] = useState(0);
  const [playlistFocusCol, setPlaylistFocusCol] = useState(0);
  const [playlistBounceDirection, setPlaylistBounceDirection] = useState<NavigationDirection | null>(null);
  const [playlistIsPressing, setPlaylistIsPressing] = useState(false);

  const audioUnlockedRef = useRef(false);
  const games = PLACEHOLDER_GAMES;

  // Loading → game-menu timer
  useEffect(() => {
    if (currentScreen === 'loading') {
      const timer = setTimeout(() => setCurrentScreen('game-menu'), LOADING_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [currentScreen]);

  const openMenu = useCallback((initialTab: SystemMenuTab = 'resume') => {
    setMenuState({ ...INITIAL_MENU_STATE, open: true, tab: initialTab });
    soundManager.playSelectionSound();
  }, []);

  const closeMenu = useCallback(() => {
    if (bounceTimeoutRef.current) {
      window.clearTimeout(bounceTimeoutRef.current);
      bounceTimeoutRef.current = null;
    }
    setMenuState(INITIAL_MENU_STATE);
  }, []);

  // Flash a bounce animation on the current layer's focused element when the
  // user presses an invalid direction, then clear it after BOUNCE_DURATION_MS.
  const triggerMenuBounce = useCallback(
    (layer: SystemMenuState['layer'], direction: NavigationDirection) => {
      soundManager.playBounceSound();
      setMenuState((prev) => (prev.open ? { ...prev, bounce: { layer, direction } } : prev));
      if (bounceTimeoutRef.current) {
        window.clearTimeout(bounceTimeoutRef.current);
      }
      bounceTimeoutRef.current = window.setTimeout(() => {
        setMenuState((prev) => (prev.bounce ? { ...prev, bounce: null } : prev));
        bounceTimeoutRef.current = null;
      }, BOUNCE_DURATION_MS);
    },
    []
  );

  // Selecting an item inside the Exit Game tab.
  const handleExitGameAction = useCallback(
    (action: ReturnType<typeof getExitGameActions>[number]) => {
      switch (action.kind) {
        case 'confirm-no':
          closeMenu();
          return;
        case 'confirm-yes':
          // "Leave app" — not prototyped; just close the menu.
          closeMenu();
          return;
        case 'exit':
          // Exit current game → back to hub
          setCurrentScreen('hub');
          setActiveGameId(undefined);
          setMenuFocusedIndex(0);
          setPlaylistFocusRow(0);
          setPlaylistFocusCol(0);
          closeMenu();
          return;
        case 'launch':
          // Switch to a different game. Only Song Quiz is wired;
          // everything else is a no-op stub per design.
          if (action.gameId === 'game-1') {
            setCurrentScreen('loading');
            setActiveGameId('game-1');
          }
          closeMenu();
          return;
      }
    },
    [closeMenu]
  );

  // Navigation inside the System Menu (when open).
  const handleMenuNavigate = useCallback(
    (direction: NavigationDirection) => {
      // Read current state once — we either transition to a new state (returned
      // synchronously via setMenuState) or bounce, which is handled outside the
      // updater so setTimeout scheduling is clean.
      const prev = menuStateRef.current;
      if (!prev.open) return;
      const tabs: SystemMenuState['tab'][] = ['resume', 'controllers', 'exit'];
      const tabIdx = tabs.indexOf(prev.tab);

      if (prev.layer === 'tabs') {
        if (direction === 'left' && tabIdx > 0) {
          soundManager.playNavigationSound();
          setMenuState({ ...prev, tab: tabs[tabIdx - 1], contentIndex: 0, bounce: null });
          return;
        }
        if (direction === 'right' && tabIdx < tabs.length - 1) {
          soundManager.playNavigationSound();
          setMenuState({ ...prev, tab: tabs[tabIdx + 1], contentIndex: 0, bounce: null });
          return;
        }
        if (direction === 'up' && prev.tab === 'exit') {
          // Tabs sit at the bottom; pressing up moves focus into the L2
          // content above. Only tabs with interactive content accept focus.
          soundManager.playNavigationSound();
          setMenuState({ ...prev, layer: 'content', contentIndex: 0, bounce: null });
          return;
        }
        triggerMenuBounce('tabs', direction);
        return;
      }

      // layer === 'content'
      if (prev.tab === 'exit') {
        const actions = getExitGameActions(APP_TO_TV_SCREEN[currentScreen], activeGameId);
        if (direction === 'left' && prev.contentIndex > 0) {
          soundManager.playNavigationSound();
          setMenuState({ ...prev, contentIndex: prev.contentIndex - 1, bounce: null });
          return;
        }
        if (direction === 'right' && prev.contentIndex < actions.length - 1) {
          soundManager.playNavigationSound();
          setMenuState({ ...prev, contentIndex: prev.contentIndex + 1, bounce: null });
          return;
        }
        if (direction === 'down') {
          // Content is above the tab row; pressing down returns to tabs.
          soundManager.playNavigationSound();
          setMenuState({ ...prev, layer: 'tabs', bounce: null });
          return;
        }
      }
      triggerMenuBounce('content', direction);
    },
    [currentScreen, activeGameId, triggerMenuBounce]
  );

  const handleMenuAction = useCallback(
    (action: NavigationAction) => {
      if (action === 'system') {
        closeMenu();
        return;
      }
      if (action === 'back') {
        setMenuState((prev) => {
          if (prev.layer === 'content') {
            return { ...prev, layer: 'tabs' };
          }
          // layer === 'tabs' → close
          return INITIAL_MENU_STATE;
        });
        return;
      }
      if (action === 'ok') {
        if (menuState.layer === 'tabs') {
          if (menuState.tab === 'resume') {
            closeMenu();
            return;
          }
          if (menuState.tab === 'exit') {
            // Enter exit-game content; confirm-Yes/No on hub is implicit via content focus
            setMenuState((prev) => ({ ...prev, layer: 'content', contentIndex: 0 }));
            return;
          }
          // controllers tab: OK does nothing — display-only
          soundManager.playBounceSound();
          return;
        }
        // layer === 'content'
        if (menuState.tab === 'exit') {
          const actions = getExitGameActions(APP_TO_TV_SCREEN[currentScreen], activeGameId);
          const selected = actions[menuState.contentIndex];
          if (selected) {
            soundManager.playSelectionSound();
            handleExitGameAction(selected);
          }
        }
      }
    },
    [menuState, currentScreen, activeGameId, closeMenu, handleExitGameAction]
  );

  const handleNavigate = useCallback(
    (direction: NavigationDirection) => {
      // System menu consumes all navigation when open.
      if (menuState.open) {
        handleMenuNavigate(direction);
        return;
      }

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
      } else if (currentScreen === 'playlist-select') {
        // Grid navigation for playlist selection
        // Sound effects are played inside updaters to match hub/game-menu pattern
        switch (direction) {
          case 'left':
            setPlaylistFocusCol((current) => {
              if (current === 0) {
                setPlaylistBounceDirection(direction);
                setTimeout(() => setPlaylistBounceDirection(null), 200);
                soundManager.playBounceSound();
                return current;
              }
              soundManager.playNavigationSound();
              return current - 1;
            });
            break;
          case 'right':
            setPlaylistFocusCol((current) => {
              const maxCol = (playlistFocusRow === 0 ? GRID.featured.count : GRID.recent.count) - 1;
              if (current === maxCol) {
                setPlaylistBounceDirection(direction);
                setTimeout(() => setPlaylistBounceDirection(null), 200);
                soundManager.playBounceSound();
                return current;
              }
              soundManager.playNavigationSound();
              return current + 1;
            });
            break;
          case 'up':
            if (playlistFocusRow === 0) {
              setPlaylistBounceDirection(direction);
              setTimeout(() => setPlaylistBounceDirection(null), 200);
              soundManager.playBounceSound();
            } else {
              const closestCol = findClosestCol(playlistFocusRow, playlistFocusCol, 0);
              setPlaylistFocusRow(0);
              setPlaylistFocusCol(closestCol);
              soundManager.playNavigationSound();
            }
            break;
          case 'down':
            if (playlistFocusRow === 1) {
              setPlaylistBounceDirection(direction);
              setTimeout(() => setPlaylistBounceDirection(null), 200);
              soundManager.playBounceSound();
            } else {
              const closestCol = findClosestCol(playlistFocusRow, playlistFocusCol, 1);
              setPlaylistFocusRow(1);
              setPlaylistFocusCol(closestCol);
              soundManager.playNavigationSound();
            }
            break;
        }
      }
    },
    [menuState.open, handleMenuNavigate, currentScreen, games.length, playlistFocusRow, playlistFocusCol]
  );

  const handleAction = useCallback(
    (action: NavigationAction) => {
      // System menu interception
      if (menuState.open) {
        handleMenuAction(action);
        return;
      }
      if (action === 'system') {
        openMenu('resume');
        return;
      }
      if (action === 'back' && BOUNDARY_SCREENS.has(currentScreen)) {
        openMenu('exit');
        return;
      }

      if (currentScreen === 'hub') {
        if (action === 'ok') {
          const selectedGame = games[focusedIndex];
          setIsPressing(true);
          setTimeout(() => setIsPressing(false), 150);
          soundManager.playSelectionSound();

          // Launch Song Quiz
          if (selectedGame.id === 'game-1') {
            setActiveGameId('game-1');
            setTimeout(() => setCurrentScreen('loading'), 150);
          }
        }
      } else if (currentScreen === 'game-menu') {
        if (action === 'ok') {
          setMenuIsPressing(true);
          setTimeout(() => setMenuIsPressing(false), 150);
          soundManager.playSelectionSound();

          // Launch Single Player playlist selection
          if (menuFocusedIndex === 0) {
            setTimeout(() => setCurrentScreen('playlist-select'), 150);
          }
        }
        // back on game-menu is a boundary → handled above (opens system menu)
      } else if (currentScreen === 'playlist-select') {
        if (action === 'ok') {
          setPlaylistIsPressing(true);
          setTimeout(() => setPlaylistIsPressing(false), 150);
          soundManager.playSelectionSound();
          // Transition into gameplay stub
          setTimeout(() => setCurrentScreen('in-game'), 150);
        } else if (action === 'back') {
          setCurrentScreen('game-menu');
          setPlaylistFocusRow(0);
          setPlaylistFocusCol(0);
          setPlaylistBounceDirection(null);
        }
      }
      // in-game: only back (boundary) and system are handled above
    },
    [menuState.open, handleMenuAction, currentScreen, focusedIndex, games, menuFocusedIndex, openMenu]
  );

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

  const { socket, roomCode, connectionStatus, connectedMobileIds } = useSocket(handleNavigationInput);

  // Broadcast screen state to mobile devices
  useEffect(() => {
    if (socket) {
      socket.emit(SOCKET_EVENTS.SCREEN_UPDATE, {
        screen: APP_TO_TV_SCREEN[currentScreen],
        gameId: activeGameId,
      });
    }
  }, [currentScreen, activeGameId, socket]);

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

  let screenContent: JSX.Element;
  if (currentScreen === 'loading') {
    screenContent = <LoadingScreen />;
  } else if (currentScreen === 'game-menu') {
    screenContent = (
      <GameMenu
        focusedIndex={menuFocusedIndex}
        bounceDirection={menuBounceDirection}
        isPressing={menuIsPressing}
      />
    );
  } else if (currentScreen === 'playlist-select') {
    screenContent = (
      <PlaylistSelect
        focusRow={playlistFocusRow}
        focusCol={playlistFocusCol}
        bounceDirection={playlistBounceDirection}
        isPressing={playlistIsPressing}
      />
    );
  } else if (currentScreen === 'in-game') {
    screenContent = <InGameStub />;
  } else {
    screenContent = (
      <GameHub
        roomCode={roomCode}
        focusedIndex={focusedIndex}
        bounceDirection={bounceDirection}
        isPressing={isPressing}
        onFocusChange={setFocusedIndex}
      />
    );
  }

  return (
    <>
      {screenContent}
      <SystemMenu
        state={menuState}
        roomCode={roomCode}
        screen={APP_TO_TV_SCREEN[currentScreen]}
        gameId={activeGameId}
        connectedMobileIds={connectedMobileIds}
      />
    </>
  );
}

export default App;
