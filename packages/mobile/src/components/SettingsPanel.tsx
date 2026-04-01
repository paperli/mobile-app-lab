import { useState } from 'react';
import { HapticFeedback } from '../utils/haptics';

type AppMode = 'dpad' | 'game' | 'theme';

interface SettingsPanelProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  onDisconnect: () => void;
  onClose: () => void;
}

const MODES: { value: AppMode; label: string }[] = [
  { value: 'dpad', label: 'System Controller' },
  { value: 'game', label: 'Game Modal' },
  { value: 'theme', label: 'Theme Switching' },
];

function MenuItem({
  icon,
  label,
  right,
  danger,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  right?: React.ReactNode;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <button
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px 20px',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        color: danger ? 'rgba(255,80,80,0.85)' : 'white',
        fontSize: '16px',
        fontWeight: 500,
        textAlign: 'left',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
        HapticFeedback.light();
        onPress();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onPress();
      }}
    >
      <span style={{ opacity: 0.6, fontSize: '20px', width: '24px', textAlign: 'center' }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {right && <span style={{ opacity: 0.4, fontSize: '14px' }}>{right}</span>}
    </button>
  );
}

function ModalCard({ children, onBackdropPress }: { children: React.ReactNode; onBackdropPress: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
      }}
      onTouchStart={(e) => {
        if (e.target === e.currentTarget) onBackdropPress();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onBackdropPress();
      }}
    >
      <div
        style={{
          background: 'rgba(30,30,50,0.95)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '24px',
          width: 'calc(100% - 64px)',
          maxWidth: '360px',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function SettingsPanel({ currentMode, onModeChange, onDisconnect, onClose }: SettingsPanelProps) {
  const [showModePicker, setShowModePicker] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  return (
    <>
      {/* Main settings overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99998,
          background: 'rgba(0,0,15,0.97)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onTouchStart={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px', paddingTop: 'max(env(safe-area-inset-top, 16px), 16px)' }}>
          <button
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              HapticFeedback.light();
              onClose();
            }}
            onClick={() => onClose()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 19l-7-7 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
            </svg>
          </button>
          <span style={{ flex: 1, textAlign: 'center', color: 'white', fontSize: '18px', fontWeight: 700, marginRight: '40px' }}>
            Controller Settings
          </span>
        </div>

        {/* Menu items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 24px' }}>
          <MenuItem
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.8" />
                <rect x="13" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.8" />
                <rect x="3" y="13" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.8" />
                <rect x="13" y="13" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            }
            label="Switch Mode"
            right={MODES.find((m) => m.value === currentMode)?.label}
            onPress={() => setShowModePicker(true)}
          />

          <MenuItem
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            }
            label="Support"
            onPress={() => {}}
          />

          <MenuItem
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            }
            label="Disconnect Controller"
            danger
            onPress={() => setShowDisconnectConfirm(true)}
          />
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '14px', paddingBottom: '48px' }}>
          Version 1.0.0
        </div>
      </div>

      {/* Mode picker modal */}
      {showModePicker && (
        <ModalCard onBackdropPress={() => setShowModePicker(false)}>
          <div style={{ padding: '28px 20px 24px' }}>
            <div style={{ color: 'white', fontSize: '20px', fontWeight: 700, textAlign: 'center', marginBottom: '20px' }}>
              Switch Mode
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {MODES.map((mode) => (
                <button
                  key={mode.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '14px 20px',
                    background: mode.value === currentMode ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    HapticFeedback.light();
                    onModeChange(mode.value);
                    setShowModePicker(false);
                  }}
                  onClick={() => {
                    onModeChange(mode.value);
                    setShowModePicker(false);
                  }}
                >
                  <span style={{ flex: 1, textAlign: 'left' }}>{mode.label}</span>
                  {mode.value === currentMode && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
            <button
              style={{
                width: '100%',
                marginTop: '20px',
                padding: '14px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '16px',
                color: 'white',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                HapticFeedback.light();
                setShowModePicker(false);
              }}
              onClick={() => setShowModePicker(false)}
            >
              Cancel
            </button>
          </div>
        </ModalCard>
      )}

      {/* Disconnect confirmation modal */}
      {showDisconnectConfirm && (
        <ModalCard onBackdropPress={() => setShowDisconnectConfirm(false)}>
          <div style={{ padding: '32px 24px' }}>
            <div style={{ color: 'white', fontSize: '20px', fontWeight: 700, textAlign: 'center' }}>
              Disconnect your controller?
            </div>
            <div style={{ color: 'gray', fontSize: '14px', textAlign: 'center', marginTop: '8px' }}>
              Your controller will disconnect from the game and you'll return to the pairing screen.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
              <button
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'rgba(255,80,80,0.8)',
                  border: 'none',
                  borderRadius: '16px',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  HapticFeedback.medium();
                  onDisconnect();
                }}
                onClick={() => onDisconnect()}
              >
                Disconnect
              </button>
              <button
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '16px',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  HapticFeedback.light();
                  setShowDisconnectConfirm(false);
                }}
                onClick={() => setShowDisconnectConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </ModalCard>
      )}
    </>
  );
}
