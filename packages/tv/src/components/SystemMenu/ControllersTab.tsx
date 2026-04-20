import { QRCodeSVG } from 'qrcode.react';
import {
  GAME_MAX_PLAYERS,
  HUB_SLOT_COUNT,
  type TVScreen,
  type ConnectionSlotStatus,
} from '@mobile-app-lab/shared';
import { getMobileUrl } from '../../utils/getMobileUrl';

interface ControllersTabProps {
  roomCode: string;
  screen: TVScreen;
  gameId?: string;
  connectedMobileIds: string[];
}

function getSlotCount(screen: TVScreen, gameId?: string): number {
  if (screen === 'hub') return HUB_SLOT_COUNT;
  if (!gameId) return 1;
  return GAME_MAX_PLAYERS[gameId] ?? 1;
}

function statusLabel(status: ConnectionSlotStatus): string {
  switch (status) {
    case 'connected':
      return 'Connected';
    case 'connecting':
      return 'Connecting';
    case 'waiting':
      return 'Waiting';
  }
}

function statusColor(status: ConnectionSlotStatus): string {
  switch (status) {
    case 'connected':
      return '#4ADE80';
    case 'connecting':
      return '#FACC15';
    case 'waiting':
      return 'rgba(255,255,255,0.35)';
  }
}

export function ControllersTab({ roomCode, screen, gameId, connectedMobileIds }: ControllersTabProps) {
  const slotCount = getSlotCount(screen, gameId);
  const mobileUrl = `${getMobileUrl()}?code=${roomCode}`;
  const slots: ConnectionSlotStatus[] = Array.from({ length: slotCount }, (_, i) =>
    i < connectedMobileIds.length ? 'connected' : 'waiting'
  );

  return (
    <div
      style={{
        display: 'flex',
        gap: '4vw',
        padding: '2vh 3vw',
        border: '1px dashed rgba(255,255,255,0.25)',
        borderRadius: '12px',
        alignItems: 'stretch',
      }}
    >
      {/* Left: QR + Code */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5vh',
          minWidth: '18vw',
        }}
      >
        <div style={{ background: 'white', padding: '0.8vw', borderRadius: '8px' }}>
          <QRCodeSVG value={mobileUrl} size={Math.min(window.innerWidth * 0.12, 180)} level="M" includeMargin={false} />
        </div>
        <div
          style={{
            fontSize: '0.9vw',
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontFamily: 'ui-monospace, monospace',
          }}
        >
          Room Code
        </div>
        <div
          style={{
            fontSize: '2.6vw',
            fontWeight: 700,
            color: 'white',
            letterSpacing: '0.15em',
            fontFamily: 'ui-monospace, monospace',
          }}
        >
          {roomCode || '------'}
        </div>
      </div>

      {/* Right: Slots */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1vh' }}>
        <div
          style={{
            fontSize: '0.9vw',
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontFamily: 'ui-monospace, monospace',
            marginBottom: '0.5vh',
          }}
        >
          Connection Slots — {connectedMobileIds.length} / {slotCount}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: slotCount > 3 ? '1fr 1fr' : '1fr',
            gap: '1vh 1.5vw',
          }}
        >
          {slots.map((status, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1vw',
                padding: '1vh 1.5vw',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                background: status === 'connected' ? 'rgba(74,222,128,0.06)' : 'transparent',
              }}
            >
              <span
                style={{
                  width: '0.9vw',
                  height: '0.9vw',
                  borderRadius: '50%',
                  background: statusColor(status),
                  boxShadow: status === 'connected' ? `0 0 8px ${statusColor(status)}` : 'none',
                }}
              />
              <span style={{ flex: 1, color: 'white', fontSize: '1.2vw', fontWeight: 500 }}>
                Slot {idx + 1}
              </span>
              <span
                style={{
                  fontSize: '1vw',
                  color: statusColor(status),
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontFamily: 'ui-monospace, monospace',
                }}
              >
                {statusLabel(status)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
