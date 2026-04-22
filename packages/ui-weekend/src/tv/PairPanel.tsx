import { QRCodeSVG } from 'qrcode.react';
import { ModalPanel } from '../primitives/ModalPanel';
import { SlotCard, type Slot } from './SlotCard';

export interface PairPanelProps {
  /** URL encoded into the QR code. Usually `${mobileUrl}?code=${roomCode}`. */
  mobileUrl: string;
  /** Short user-visible host for the manual-entry instruction. */
  mobileHost?: string;
  roomCode: string;
  slots: Slot[];
  title?: string;
  manualInstruction?: string;
}

/**
 * Reusable TV pairing panel — QR + room code + slot status circles.
 * Sits inside the Midnight Blue ModalPanel with the DS modal spacing:
 * 64px padding, 32px title→text, 48px text→slots.
 */
export function PairPanel({
  mobileUrl,
  mobileHost = 'play.weekend.com',
  roomCode,
  slots,
  title = 'Scan QR code and play',
  manualInstruction,
}: PairPanelProps) {
  const manual = manualInstruction ?? `Go to ${mobileHost} and enter the room code`;

  return (
    <ModalPanel tone="midnight" className="w-full" style={{ padding: '64px' }}>
      <h3 className="text-center text-display-3 font-bold text-fg">{title}</h3>

      <div
        className="flex items-center justify-center"
        style={{ gap: '3vw', marginTop: '32px' }}
      >
        {/* QR */}
        <div
          className="bg-white rounded-card flex items-center justify-center"
          style={{ padding: '1vw' }}
        >
          <QRCodeSVG value={mobileUrl} size={180} level="M" includeMargin={false} />
        </div>

        {/* Manual entry instructions */}
        <div className="flex flex-col" style={{ gap: '1.2vh', maxWidth: '32vw' }}>
          <h4 className="text-title font-semibold text-fg">{manual}</h4>
          <div
            className="text-fg"
            style={{
              fontFamily: 'var(--font-code)',
              fontWeight: 800,
              fontSize: '64px',
              letterSpacing: '0.12em',
              lineHeight: 1,
            }}
          >
            {roomCode || '------'}
          </div>
        </div>
      </div>

      {/* Slots */}
      <div
        className="flex items-start justify-center"
        style={{ gap: '2.5vw', marginTop: '48px' }}
      >
        {slots.map((slot) => (
          <SlotCard key={slot.id} slot={slot} />
        ))}
      </div>
    </ModalPanel>
  );
}
