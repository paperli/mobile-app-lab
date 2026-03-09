import { useState, useEffect, useCallback } from 'react';
import { ControllerMode } from '@mobile-app-lab/shared';
import { useSocket } from './hooks/useSocket';
import { PairingScreen } from './components/PairingScreen';
import { DPadController } from './components/DPadController';
import { JoystickController } from './components/JoystickController';
import { GamepadController } from './components/GamepadController';
import { TrackpadController } from './components/TrackpadController';
import { SquareController } from './components/SquareController';
import { GameModal } from './components/GameModal';

type AppMode = 'dpad' | 'game' | 'theme';

function App() {
  const { connectionStatus, isPaired, tvScreen, joinRoom, sendNavigationInput } = useSocket();
  const [controllerMode, setControllerMode] = useState<ControllerMode>('square-hybrid');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string>();
  const [appMode, setAppMode] = useState<AppMode | null>(null);

  // Expose mode to native bridge
  useEffect(() => {
    (window as any).__getAppMode = () => appMode;
    (window as any).__setAppMode = (mode: AppMode | null) => setAppMode(mode);
    return () => {
      delete (window as any).__getAppMode;
      delete (window as any).__setAppMode;
    };
  }, [appMode]);

  // Load controller mode preference from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('controllerMode') as ControllerMode;
    if (savedMode === 'dpad' || savedMode === 'trackpad' || savedMode === 'gamepad' || savedMode === 'hybrid' || savedMode === 'square-hybrid') {
      setControllerMode(savedMode);
    }
  }, []);

  const handlePair = useCallback(
    (code: string) => {
      setIsConnecting(true);
      setError(undefined);
      joinRoom(code);

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!isPaired) {
          setIsConnecting(false);
          setError('Failed to connect. Please check the code and try again.');
        }
      }, 5000);
    },
    [joinRoom, isPaired]
  );

  // Handle successful pairing
  useEffect(() => {
    if (isPaired) {
      setIsConnecting(false);
      setError(undefined);
    }
  }, [isPaired]);

  // Handle connection errors
  useEffect(() => {
    if (connectionStatus.error) {
      setError(connectionStatus.error);
      setIsConnecting(false);
    }
  }, [connectionStatus.error]);

  // Auto-join room if code is in URL query parameter
  useEffect(() => {
    if (connectionStatus.connected && !isPaired && !isConnecting) {
      const urlParams = new URLSearchParams(window.location.search);
      const codeFromUrl = urlParams.get('code');

      if (codeFromUrl) {
        console.log('[Mobile] Auto-joining room from URL:', codeFromUrl);
        handlePair(codeFromUrl);
      }
    }
  }, [connectionStatus.connected, isPaired, isConnecting, handlePair]);

  const handleNavigate = useCallback(
    (direction: string) => {
      sendNavigationInput({
        type: 'navigate',
        direction: direction as any,
        timestamp: Date.now(),
      });
    },
    [sendNavigationInput]
  );

  const handleAction = useCallback(
    (action: string) => {
      sendNavigationInput({
        type: 'action',
        action: action as any,
        timestamp: Date.now(),
      });
    },
    [sendNavigationInput]
  );

  // Show connection loading
  if (!connectionStatus.connected) {
    return (
      <div className="w-full h-full bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-pulse">📡</div>
          <h1 className="text-3xl font-bold mb-4">Connecting to Server...</h1>
          <p className="text-gray-400">Please wait</p>
        </div>
      </div>
    );
  }

  // Show pairing screen if not paired
  if (!isPaired) {
    return <PairingScreen onPair={handlePair} isConnecting={isConnecting} error={error} />;
  }

  // Show mode selection after pairing
  if (appMode === null) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-6 px-8" style={{ backgroundColor: '#00001f' }}>
        <h1 className="text-white text-2xl font-bold mb-4">Select Mode</h1>
        <button
          onClick={() => setAppMode('dpad')}
          className="w-full max-w-xs py-4 px-6 rounded-2xl text-white text-lg font-semibold"
          style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
        >
          System Controller Mode
        </button>
        <button
          onClick={() => setAppMode('game')}
          className="w-full max-w-xs py-4 px-6 rounded-2xl text-white text-lg font-semibold"
          style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
        >
          Game Modal Mode
        </button>
        <button
          onClick={() => setAppMode('theme')}
          className="w-full max-w-xs py-4 px-6 rounded-2xl text-white text-lg font-semibold"
          style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
        >
          Theme Switching Mode
        </button>
      </div>
    );
  }

  // Game Modal Mode: d-pad underneath, game modal slides up
  if (appMode === 'game') {
    const showGameModal = tvScreen !== 'hub';
    return (
      <div className="relative w-full h-full overflow-hidden">
        <div className="h-full">
          <SquareController onNavigate={handleNavigate} onAction={handleAction} />
        </div>

        <div
          className="absolute inset-0 transition-transform duration-500 ease-out"
          style={{ transform: showGameModal ? 'translateY(0)' : 'translateY(100%)', zIndex: 10000 }}
        >
          <GameModal tvScreen={tvScreen} onNavigate={handleNavigate} onAction={handleAction} />
        </div>
      </div>
    );
  }

  // Theme Switching Mode: d-pad underneath, ellipse reveal transition
  if (appMode === 'theme') {
    const showGameModal = tvScreen !== 'hub';
    return (
      <div className="relative w-full h-full overflow-hidden">
        <div className="h-full">
          <SquareController onNavigate={handleNavigate} onAction={handleAction} />
        </div>

        <div
          className="absolute inset-0"
          style={{
            zIndex: 10000,
            clipPath: showGameModal
              ? 'ellipse(200% 150% at 50% 100%)'
              : 'ellipse(60% 0% at 50% 100%)',
            transition: 'clip-path 600ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <GameModal
            tvScreen={tvScreen}
            onNavigate={handleNavigate}
            onAction={handleAction}
          />
        </div>
      </div>
    );
  }

  // System Controller Mode: just the d-pad
  return (
    <div className="relative w-full h-full">
      <div className="h-full">
        {controllerMode === 'dpad' && (
          <DPadController onNavigate={handleNavigate} onAction={handleAction} />
        )}
        {controllerMode === 'trackpad' && (
          <JoystickController onNavigate={handleNavigate} onAction={handleAction} />
        )}
        {controllerMode === 'gamepad' && (
          <GamepadController onNavigate={handleNavigate} onAction={handleAction} />
        )}
        {controllerMode === 'hybrid' && (
          <TrackpadController onNavigate={handleNavigate} onAction={handleAction} />
        )}
        {controllerMode === 'square-hybrid' && (
          <SquareController onNavigate={handleNavigate} onAction={handleAction} />
        )}
      </div>
    </div>
  );
}

export default App;
