import { NavigationDirection, NavigationAction } from '@mobile-app-lab/shared';
import { HapticFeedback } from '../utils/haptics';

interface GamepadControllerProps {
  onNavigate: (direction: NavigationDirection) => void;
  onAction: (action: NavigationAction) => void;
}

export function GamepadController({ onNavigate, onAction }: GamepadControllerProps) {
  const handleButtonPress = (direction: NavigationDirection | null, action: NavigationAction | null) => {
    // Trigger haptic feedback based on action type
    if (action === 'ok') {
      HapticFeedback.medium(); // Stronger feedback for confirm
    } else {
      HapticFeedback.light(); // Light feedback for navigation
    }

    if (direction) {
      onNavigate(direction);
    } else if (action) {
      onAction(action);
    }
  };

  const dpadButtonClasses = `
    flex items-center justify-center
    bg-slate-600 active:bg-slate-500
    rounded-3xl
    text-slate-800 text-4xl font-bold
    transition-all duration-100
    active:scale-95
    shadow-lg active:shadow-xl
    select-none
    touch-none
  `;

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-900 p-8">
      {/* D-Pad Cross Layout */}
      <div className="relative w-72 h-72 mb-8">
        {/* Up Button */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            handleButtonPress('up', null);
          }}
          className={`${dpadButtonClasses} absolute top-0 left-1/2 -translate-x-1/2 w-24 h-28`}
        >
          ▲
        </button>

        {/* Down Button */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            handleButtonPress('down', null);
          }}
          className={`${dpadButtonClasses} absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-28`}
        >
          ▼
        </button>

        {/* Left Button */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            handleButtonPress('left', null);
          }}
          className={`${dpadButtonClasses} absolute left-0 top-1/2 -translate-y-1/2 w-28 h-24`}
        >
          ◀
        </button>

        {/* Right Button */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            handleButtonPress('right', null);
          }}
          className={`${dpadButtonClasses} absolute right-0 top-1/2 -translate-y-1/2 w-28 h-24`}
        >
          ▶
        </button>
      </div>

      {/* A and B Buttons */}
      <div className="flex flex-col items-center gap-4 mb-8">
        {/* A Button (Larger) */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            handleButtonPress(null, 'ok');
          }}
          className="
            flex items-center justify-center
            w-64 h-24 bg-green-600 active:bg-green-500
            border-4 border-green-500 active:border-green-400
            rounded-2xl text-white text-3xl font-bold
            transition-all duration-100 active:scale-95
            shadow-lg active:shadow-xl
            select-none touch-none
          "
        >
          A
        </button>

        {/* B Button (Smaller) */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            handleButtonPress(null, 'back');
          }}
          className="
            flex items-center justify-center
            w-48 h-18 bg-red-600 active:bg-red-500
            border-4 border-red-500 active:border-red-400
            rounded-2xl text-white text-2xl font-bold
            transition-all duration-100 active:scale-95
            shadow-lg active:shadow-xl
            select-none touch-none
          "
        >
          B
        </button>
      </div>
    </div>
  );
}
