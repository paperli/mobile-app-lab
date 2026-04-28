import { useRef, useState } from 'react';
import { SystemButton } from '@weekend/ui';
import { HapticFeedback } from '../utils/haptics';

interface TopBarProps {
  onSystem?: () => void;
  onSettings?: () => void;
}

const buttonStyle: React.CSSProperties = {
  width: '48px',
  height: '48px',
  borderRadius: '7999.2px',
  border: '1.6px solid #000',
  background: 'linear-gradient(0deg, #313149 0%, #313149 100%), #110F0D',
  boxShadow: '1px 2px 2px 0 #888 inset, 0 0 4px 0 rgba(0, 0, 0, 0.50), -1px -2px 2px 0 #1A1A1A inset',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
  transition: 'transform 150ms ease-out',
  overflow: 'visible',
  position: 'relative' as const,
};

function TopBarButton({
  style,
  onPress,
  fireOnRelease,
  children,
}: {
  style?: React.CSSProperties;
  onPress: () => void;
  fireOnRelease?: boolean;
  children: React.ReactNode;
}) {
  const [pressed, setPressed] = useState(false);
  const [ripple, setRipple] = useState(false);
  // On touch devices, onTouchStart fires first and then the browser
  // synthesizes a click event a moment later, which would invoke onPress
  // a second time. Track the last touch timestamp and swallow synthetic
  // clicks that land within a short window.
  const lastTouchAtRef = useRef(0);

  const triggerRipple = () => {
    setRipple(true);
    setTimeout(() => setRipple(false), 400);
  };

  return (
    <button
      style={{
        ...buttonStyle,
        ...style,
        pointerEvents: 'auto',
        ...(pressed ? { transform: 'scale(0.90)' } : {}),
      }}
      onTouchStart={(e) => {
        e.preventDefault();
        lastTouchAtRef.current = Date.now();
        setPressed(true);
        HapticFeedback.light();
        if (!fireOnRelease) {
          onPress();
          triggerRipple();
          setTimeout(() => setPressed(false), 150);
        }
      }}
      onTouchEnd={() => {
        if (fireOnRelease && pressed) {
          onPress();
          triggerRipple();
        }
        setPressed(false);
      }}
      onTouchCancel={() => setPressed(false)}
      onClick={() => {
        // Suppress the synthetic click that follows a real touch.
        if (Date.now() - lastTouchAtRef.current < 500) return;
        if (!fireOnRelease) {
          onPress();
          triggerRipple();
        }
      }}
    >
      {children}
      {ripple && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.25)',
              animation: 'topbar-ripple 400ms ease-out forwards',
            }}
          />
        </div>
      )}
      <style>{`
        @keyframes topbar-ripple {
          0% { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </button>
  );
}

export function TopBar({ onSystem, onSettings }: TopBarProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9998,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '40px',
        paddingTop: 'max(env(safe-area-inset-top, 12px), 12px)',
        paddingBottom: '8px',
        pointerEvents: 'none',
      }}
    >
      {/* System menu (gear) — same style as the former back button */}
      <TopBarButton onPress={() => onSystem?.()}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="2" />
        </svg>
      </TopBarButton>

      {/* System button — from @weekend/ui, 56px to match existing visual weight */}
      <div style={{ pointerEvents: 'auto' }}>
        <SystemButton variant="hub" size={56} onPress={() => onSystem?.()} />
      </div>

      {/* Settings button */}
      <TopBarButton onPress={() => onSettings?.()} fireOnRelease>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="1.8" />
        </svg>
      </TopBarButton>
    </div>
  );
}
