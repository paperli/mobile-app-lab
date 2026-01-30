import { ControllerMode } from '@mobile-app-lab/shared';
import { HapticFeedback } from '../utils/haptics';

interface ControllerSelectorProps {
  mode: ControllerMode;
  onModeChange: (mode: ControllerMode) => void;
  roomCode?: string; // Optional since we're not displaying it
}

export function ControllerSelector({ mode, onModeChange }: ControllerSelectorProps) {
  const handleModeChange = (newMode: ControllerMode) => {
    // Haptic feedback when switching modes
    HapticFeedback.light();
    onModeChange(newMode);
  };

  return (
    <div className="absolute top-0 left-0 right-0 bg-gray-800/95 backdrop-blur-md px-4 py-3 border-b-2 border-gray-700 z-10">
      <style>{`
        .scrollable-menu::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center flex-shrink-0">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        </div>

        <div className="scrollable-menu flex gap-2 bg-gray-900 rounded-lg p-1 overflow-x-auto flex-nowrap" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <button
            onClick={() => handleModeChange('dpad')}
            className={`
              px-4 py-2 rounded-md text-sm font-semibold transition-all flex-shrink-0
              ${
                mode === 'dpad'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }
            `}
          >
            D-Pad
          </button>
          <button
            onClick={() => handleModeChange('gamepad')}
            className={`
              px-4 py-2 rounded-md text-sm font-semibold transition-all flex-shrink-0
              ${
                mode === 'gamepad'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }
            `}
          >
            Gamepad
          </button>
          <button
            onClick={() => handleModeChange('hybrid')}
            className={`
              px-4 py-2 rounded-md text-sm font-semibold transition-all flex-shrink-0
              ${
                mode === 'hybrid'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }
            `}
          >
            Trackpad
          </button>
          <button
            onClick={() => handleModeChange('square-hybrid')}
            className={`
              px-4 py-2 rounded-md text-sm font-semibold transition-all flex-shrink-0
              ${
                mode === 'square-hybrid'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }
            `}
          >
            Square
          </button>
          <button
            onClick={() => handleModeChange('trackpad')}
            className={`
              px-4 py-2 rounded-md text-sm font-semibold transition-all flex-shrink-0
              ${
                mode === 'trackpad'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }
            `}
          >
            Joystick
          </button>
        </div>
      </div>
    </div>
  );
}
