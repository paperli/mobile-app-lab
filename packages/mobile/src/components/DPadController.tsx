import { useState } from 'react';
import { NavigationDirection, NavigationAction } from '@mobile-app-lab/shared';
import { HapticFeedback } from '../utils/haptics';

interface DPadControllerProps {
  onNavigate: (direction: NavigationDirection) => void;
  onAction: (action: NavigationAction) => void;
}

type ButtonPress = NavigationDirection | NavigationAction | null;

export function DPadController({ onNavigate, onAction }: DPadControllerProps) {
  const [activeButton, setActiveButton] = useState<ButtonPress>(null);

  const handleButtonPress = (direction: NavigationDirection | null, action: NavigationAction | null) => {
    // Trigger haptic feedback based on action type
    if (action === 'ok') {
      HapticFeedback.medium(); // Stronger feedback for confirm
    } else {
      HapticFeedback.light(); // Light feedback for navigation
    }

    // Set active button for ripple effect
    const buttonId = direction || action;
    setActiveButton(buttonId);
    setTimeout(() => setActiveButton(null), 300);

    if (direction) {
      onNavigate(direction);
    } else if (action) {
      onAction(action);
    }
  };

  const buttonClasses = `
    relative
    flex items-center justify-center
    bg-gray-800 active:bg-gray-600
    border-4 border-gray-600 active:border-gray-400
    rounded-2xl
    text-white text-3xl font-bold
    transition-all duration-100
    active:scale-95
    shadow-lg active:shadow-xl
    select-none
    touch-none
    overflow-hidden
  `;

  const renderRipple = (buttonId: ButtonPress) => {
    if (activeButton !== buttonId) return null;
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-full h-full rounded-2xl bg-blue-500/40 animate-ping"></div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-900 p-8">
      {/* D-Pad */}
      <div className="relative w-80 h-80 mb-12">
        {/* Up Button */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            handleButtonPress('up', null);
          }}
          className={`${buttonClasses} absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24`}
        >
          <span className="relative z-10">▲</span>
          {renderRipple('up')}
        </button>

        {/* Down Button */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            handleButtonPress('down', null);
          }}
          className={`${buttonClasses} absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-24`}
        >
          <span className="relative z-10">▼</span>
          {renderRipple('down')}
        </button>

        {/* Left Button */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            handleButtonPress('left', null);
          }}
          className={`${buttonClasses} absolute left-0 top-1/2 -translate-y-1/2 w-24 h-24`}
        >
          <span className="relative z-10">◀</span>
          {renderRipple('left')}
        </button>

        {/* Right Button */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            handleButtonPress('right', null);
          }}
          className={`${buttonClasses} absolute right-0 top-1/2 -translate-y-1/2 w-24 h-24`}
        >
          <span className="relative z-10">▶</span>
          {renderRipple('right')}
        </button>

        {/* OK Button (Center) */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            handleButtonPress(null, 'ok');
          }}
          className={`${buttonClasses} absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-600 active:bg-blue-500 border-blue-500 active:border-blue-400 text-4xl`}
        >
          <span className="relative z-10">OK</span>
          {renderRipple('ok')}
        </button>
      </div>

      {/* Back Button */}
      <button
        onTouchStart={(e) => {
          e.preventDefault();
          handleButtonPress(null, 'back');
        }}
        className={`${buttonClasses} w-64 h-20 bg-red-600 active:bg-red-500 border-red-500 active:border-red-400 text-2xl`}
      >
        <span className="relative z-10">BACK</span>
        {renderRipple('back')}
      </button>
    </div>
  );
}
