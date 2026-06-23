import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import {
  NavigationInputPayload,
  NavigationDirection,
  NavigationAction,
  PLACEHOLDER_GAMES,
  SOCKET_EVENTS,
  type VoiceTranscriptPayload,
  type VoiceConfirmResponsePayload,
} from '@mobile-app-lab/shared';
import { matchVoice, type VoiceIntent } from './utils/voiceMatcher';
import { VoiceDebugOverlay, type TVVoiceDebugEvent } from './components/VoiceDebugOverlay';
import {
  SystemMenuOverlay,
  WEEKEND_PLAYERS,
  type Slot,
  type ExitAction,
  type ExitTabContent,
  type SystemMenuOverlayHandle,
  type SystemMenuTab,
} from '@weekend/ui';
import { GameHub } from './components/GameHub';
import { LoadingScreen } from './components/song-quiz/LoadingScreen';
import { GameMenu } from './components/song-quiz/GameMenu';
import { PlaylistSelect } from './components/song-quiz/PlaylistSelect';
import { PartyPlaylistSelect, type PartyPlaylistHandle } from './components/song-quiz/PartyPlaylistSelect';
import { GRID, findClosestCol } from './components/song-quiz/PlaylistFocusFrame';
import { useSocket } from './hooks/useSocket';
import { useKeyboardNav } from './hooks/useKeyboardNav';
import { soundManager } from './utils/sounds';
import { PreviewShell } from './preview/PreviewShell';
import { getMobileUrl } from './utils/getMobileUrl';

type AppScreen = 'hub' | 'loading' | 'game-menu' | 'playlist-select' | 'party-playlist-select';

// Configuration
const ENABLE_LOOP_NAVIGATION = false;
const LOADING_DURATION_MS = 5000; // Adjustable loading time
const MENU_ITEM_COUNT = 2; // Single Player + Party Mode

// Pressing back on these screens opens the system menu (exit confirmation)
// instead of navigating up a step.
const BOUNDARY_SCREENS: ReadonlySet<AppScreen> = new Set(['hub', 'game-menu']);

function MainTvApp() {
  // Screen state
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('hub');

  // System menu state
  const [systemMenuOpen, setSystemMenuOpen] = useState(false);
  const [systemMenuInitialTab, setSystemMenuInitialTab] = useState<SystemMenuTab>('resume');
  const systemMenuRef = useRef<SystemMenuOverlayHandle>(null);
  // Keep a stable ref of the open flag for keyboard/socket handlers that
  // close over an outdated closure.
  const systemMenuOpenRef = useRef(systemMenuOpen);
  useEffect(() => {
    systemMenuOpenRef.current = systemMenuOpen;
  }, [systemMenuOpen]);

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

  // Party Mode playlist selection — self-contained nav system driven via ref.
  const partyPlaylistRef = useRef<PartyPlaylistHandle>(null);

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
    // System menu swallows all directional input while open.
    if (systemMenuOpenRef.current) {
      systemMenuRef.current?.navigate(direction);
      return;
    }
    if (currentScreen === 'party-playlist-select') {
      partyPlaylistRef.current?.navigate(direction);
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
  }, [currentScreen, games.length, playlistFocusRow, playlistFocusCol]);

  const handleAction = useCallback((action: NavigationAction) => {
    // System button toggles the menu. Open from closed starts on the Resume
    // tab; pressing system again (open) closes.
    if (action === 'system') {
      soundManager.playSelectionSound();
      if (systemMenuOpenRef.current) {
        setSystemMenuOpen(false);
      } else {
        setSystemMenuInitialTab('resume');
        setSystemMenuOpen(true);
      }
      return;
    }
    // When the menu is open, ok/back are consumed by the menu.
    if (systemMenuOpenRef.current) {
      if (action === 'ok' || action === 'back') {
        systemMenuRef.current?.action(action);
      }
      return;
    }
    // Back on a boundary screen opens the exit tab directly.
    if (action === 'back' && BOUNDARY_SCREENS.has(currentScreen)) {
      setSystemMenuInitialTab('exit');
      setSystemMenuOpen(true);
      return;
    }
    if (currentScreen === 'party-playlist-select') {
      partyPlaylistRef.current?.action(action);
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
        } else if (menuFocusedIndex === 1) {
          // Party Mode → multi-playlist (1–3) selection
          setTimeout(() => setCurrentScreen('party-playlist-select'), 150);
        }
      }
      // back on game-menu is handled as a boundary above (opens exit menu)
    } else if (currentScreen === 'playlist-select') {
      if (action === 'ok') {
        setPlaylistIsPressing(true);
        setTimeout(() => setPlaylistIsPressing(false), 150);
        soundManager.playSelectionSound();
        // TODO: start quiz with selected playlist
      } else if (action === 'back') {
        setCurrentScreen('game-menu');
        setPlaylistFocusRow(0);
        setPlaylistFocusCol(0);
        setPlaylistBounceDirection(null);
      }
    }
  }, [currentScreen, focusedIndex, games, menuFocusedIndex]);

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

  const { socket, roomCode, connectionStatus } = useSocket(handleNavigationInput);

  // Voice integration ------------------------------------------------------
  // Mobile streams transcripts → TV runs the matcher with a screen-aware
  // candidate set → TV executes (high confidence) or asks mobile to TTS-confirm
  // (medium confidence). Fuzzy candidates today are just the hub games; other
  // screens fall through to verb-only matching.

  const focusedIndexRef = useRef(focusedIndex);
  useEffect(() => { focusedIndexRef.current = focusedIndex; }, [focusedIndex]);
  const currentScreenRef = useRef<AppScreen>(currentScreen);
  useEffect(() => { currentScreenRef.current = currentScreen; }, [currentScreen]);

  const pendingVoiceIntentRef = useRef<{ id: string; intent: VoiceIntent } | null>(null);

  // Defense-in-depth dedupe: SFSpeechRecognizer can fire interim+final for the
  // same phrase, and StrictMode-era subscriptions can echo. We drop a transcript
  // if the same text arrived in the last 1.5s.
  const lastVoiceEmitRef = useRef<{ text: string; ts: number } | null>(null);

  // Debug state — TODO remove once voice is stable.
  const [voiceDebugEvents, setVoiceDebugEvents] = useState<TVVoiceDebugEvent[]>([]);
  const [pendingPromptText, setPendingPromptText] = useState<string | null>(null);
  const [pendingPromptConfirmed, setPendingPromptConfirmed] = useState<
    'pending' | 'yes' | 'no' | 'timeout' | null
  >(null);

  const VOICE_EXECUTE_THRESHOLD = 0.65;

  const executeVoiceIntent = useCallback((intent: VoiceIntent) => {
    if (intent.kind === 'navigate') {
      handleNavigate(intent.direction);
      return;
    }
    if (intent.kind === 'action') {
      handleAction(intent.action);
      return;
    }
    // goto — focus the target tile, optionally chain into ok ("play X").
    const idx = games.findIndex((g) => g.id === intent.targetId);
    if (idx < 0) return;
    setFocusedIndex(idx);
    soundManager.playNavigationSound();
    if (intent.autoLaunch) {
      // Let the focus animation settle before firing ok so the user sees what
      // they triggered.
      setTimeout(() => {
        const target = games[idx];
        if (!target) return;
        setIsPressing(true);
        setTimeout(() => setIsPressing(false), 150);
        soundManager.playSelectionSound();
        if (target.id === 'game-1') {
          setTimeout(() => setCurrentScreen('loading'), 150);
        }
      }, 250);
    }
  }, [games, handleNavigate, handleAction]);

  useEffect(() => {
    if (!socket || !roomCode) return;
    let promptCounter = 0;

    const buildContext = () => {
      if (currentScreenRef.current === 'hub') {
        return { candidates: games.map((g) => ({ id: g.id, label: g.title })) };
      }
      return { candidates: [] as { id: string; label: string }[] };
    };

    const promptFor = (intent: VoiceIntent): string => {
      if (intent.kind === 'goto') return `Did you mean ${intent.targetLabel}?`;
      if (intent.kind === 'navigate') return `Move ${intent.direction}?`;
      return `Did you say ${intent.action}?`;
    };

    let debugCounter = 0;
    const pushDebug = (e: Omit<TVVoiceDebugEvent, 'id' | 'ts'>) => {
      setVoiceDebugEvents((prev) => [
        { id: ++debugCounter, ts: Date.now(), ...e },
        ...prev,
      ].slice(0, 8));
    };

    const onTranscript = (payload: VoiceTranscriptPayload) => {
      if (!payload.isFinal) return;

      const now = Date.now();
      const last = lastVoiceEmitRef.current;
      if (last && last.text === payload.transcript && now - last.ts < 3000) {
        console.log('[TV voice] dedupe drop', payload.transcript);
        return;
      }
      lastVoiceEmitRef.current = { text: payload.transcript, ts: now };

      const intent = matchVoice(payload.transcript, buildContext());
      console.log('[TV voice]', payload.transcript, '→', intent);

      if (!intent) {
        pushDebug({
          transcript: payload.transcript,
          recognizerConfidence: payload.recognizerConfidence,
          intent: null,
          decision: 'ignore',
        });
        return;
      }

      if (intent.confidence >= VOICE_EXECUTE_THRESHOLD) {
        pushDebug({
          transcript: payload.transcript,
          recognizerConfidence: payload.recognizerConfidence,
          intent,
          decision: 'execute',
        });
        executeVoiceIntent(intent);
        return;
      }

      // Medium confidence — ask the user to confirm via mobile TTS.
      const promptId = `tv-${Date.now()}-${++promptCounter}`;
      pendingVoiceIntentRef.current = { id: promptId, intent };
      const promptText = promptFor(intent);
      setPendingPromptText(promptText);
      setPendingPromptConfirmed('pending');
      pushDebug({
        transcript: payload.transcript,
        recognizerConfidence: payload.recognizerConfidence,
        intent,
        decision: 'confirm',
      });
      socket.emit(SOCKET_EVENTS.VOICE_CONFIRM_PROMPT, {
        roomCode,
        prompt: promptText,
        promptId,
      });
    };

    const onConfirmResponse = (payload: VoiceConfirmResponsePayload) => {
      const pending = pendingVoiceIntentRef.current;
      if (!pending || pending.id !== payload.promptId) return;
      pendingVoiceIntentRef.current = null;
      const verdict =
        payload.confirmed === true ? 'yes' : payload.confirmed === false ? 'no' : 'timeout';
      setPendingPromptConfirmed(verdict);
      // Clear the banner after a beat so the next prompt has a clean slate.
      setTimeout(() => {
        setPendingPromptText(null);
        setPendingPromptConfirmed(null);
      }, 1200);
      if (payload.confirmed === true) executeVoiceIntent(pending.intent);
    };

    socket.on(SOCKET_EVENTS.VOICE_TRANSCRIPT, onTranscript);
    socket.on(SOCKET_EVENTS.VOICE_CONFIRM_RESPONSE, onConfirmResponse);
    return () => {
      socket.off(SOCKET_EVENTS.VOICE_TRANSCRIPT, onTranscript);
      socket.off(SOCKET_EVENTS.VOICE_CONFIRM_RESPONSE, onConfirmResponse);
    };
  }, [socket, roomCode, games, executeVoiceIntent]);

  // Mock slots — real party/slot domain state lands in PU&P M2.
  // Mixed states so the system-menu visual treatment can be seen end-to-end
  // before real party/slot plumbing exists.
  // TODO(PU&P M2): wire to actual party state instead of placeholders.
  const mockSlots: Slot[] = [
    { id: '1', state: 'connected',  name: WEEKEND_PLAYERS[0].name, colorHex: WEEKEND_PLAYERS[0].colorHex },
    { id: '2', state: 'connected',  name: WEEKEND_PLAYERS[1].name, colorHex: WEEKEND_PLAYERS[1].colorHex },
    { id: '3', state: 'connecting' },
    { id: '4', state: 'waiting' },
  ];

  // Mobile now sends a unified 'system' NavigationAction (handled in
  // handleAction above) instead of a dedicated SYSTEM_MENU_OPEN socket event,
  // so no listener is needed here.

  // Emit close back to mobile whenever user dismisses the overlay
  const handleMenuOpenChange = useCallback((next: boolean) => {
    setSystemMenuOpen(next);
    if (!next && socket) socket.emit(SOCKET_EVENTS.SYSTEM_MENU_CLOSE);
  }, [socket]);

  // Map current screen → Exit tab content. Hub gets a confirm dialog; all
  // other screens get the tile variant with an Exit tile + launch shortcuts
  // for the other hub games (Song Quiz goes under in-game → swap-mode tiles
  // once real mode data is wired up for PU&P).
  const exitTab: ExitTabContent = useMemo(() => {
    if (currentScreen === 'hub') {
      return {
        variant: 'confirm',
        title: 'Leave the app?',
        description: "You'll exit Weekend and return to your TV's home screen.",
      };
    }
    // Feature the newest titles (e.g. Wit's End) first. 3 hub-style tiles.
    const launchGames = [...games].filter((g) => g.id !== 'game-1').reverse().slice(0, 3);
    return {
      variant: 'tiles',
      prompt: 'Are you sure you want to exit?',
      actions: [
        { id: 'exit', label: 'Exit Game', kind: 'exit' },
        ...launchGames.map((g) => ({
          id: `launch-${g.id}`,
          label: g.title,
          title: g.title,
          backgroundColor: g.backgroundColor,
          kind: 'launch' as const,
        })),
      ],
    };
  }, [currentScreen, games]);

  const handleExitAction = useCallback((action: ExitAction) => {
    handleMenuOpenChange(false);
    if (action.kind === 'exit') {
      setCurrentScreen('hub');
      return;
    }
    // Launch action — for now, jump to loading which leads into Song Quiz's
    // flow. Proper multi-game launch lands with PU&P session plumbing.
    setCurrentScreen('loading');
  }, [handleMenuOpenChange]);

  // Broadcast screen state to mobile devices
  useEffect(() => {
    if (socket) {
      socket.emit(SOCKET_EVENTS.SCREEN_UPDATE, { screen: currentScreen });
    }
  }, [currentScreen, socket]);

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

  let screen;
  if (currentScreen === 'loading') {
    screen = <LoadingScreen />;
  } else if (currentScreen === 'game-menu') {
    screen = (
      <GameMenu
        focusedIndex={menuFocusedIndex}
        bounceDirection={menuBounceDirection}
        isPressing={menuIsPressing}
      />
    );
  } else if (currentScreen === 'playlist-select') {
    screen = (
      <PlaylistSelect
        focusRow={playlistFocusRow}
        focusCol={playlistFocusCol}
        bounceDirection={playlistBounceDirection}
        isPressing={playlistIsPressing}
      />
    );
  } else if (currentScreen === 'party-playlist-select') {
    screen = (
      <PartyPlaylistSelect
        ref={partyPlaylistRef}
        onExit={() => setCurrentScreen('game-menu')}
        onSubmit={(ids) => {
          console.log('[Party] submit playlists', ids);
          // TODO: start the party quiz with the selected playlists.
          setTimeout(() => setCurrentScreen('loading'), 150);
        }}
      />
    );
  } else {
    screen = (
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
      {screen}
      <VoiceDebugOverlay
        events={voiceDebugEvents}
        pendingPromptText={pendingPromptText}
        pendingPromptConfirmed={pendingPromptConfirmed}
      />
      <SystemMenuOverlay
        ref={systemMenuRef}
        open={systemMenuOpen}
        onOpenChange={handleMenuOpenChange}
        mobileUrl={getMobileUrl()}
        roomCode={roomCode}
        slots={mockSlots}
        exitTab={exitTab}
        initialTab={systemMenuInitialTab}
        onResume={() => handleMenuOpenChange(false)}
        onExitAction={handleExitAction}
        onNavigate={() => soundManager.playNavigationSound()}
        onBounce={() => soundManager.playBounceSound()}
        onSelect={() => soundManager.playSelectionSound()}
      />
    </>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainTvApp />} />
      {import.meta.env.DEV && <Route path="/ui-preview/*" element={<PreviewShell />} />}
    </Routes>
  );
}

export default App;
