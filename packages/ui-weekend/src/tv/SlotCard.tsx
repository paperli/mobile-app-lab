import { Smartphone, RotateCw } from 'lucide-react';
import { initial } from './playerLibrary';

export type SlotState = 'waiting' | 'connecting' | 'connected';

export interface Slot {
  id: string;
  state: SlotState;
  name?: string;
  colorHex?: string;
}

export interface SlotCardProps {
  slot: Slot;
  /** Circle diameter in vw. Defaults to 5vw (~72px at 1920). */
  sizeVw?: number;
}

/**
 * SlotCard — circular connection slot with status label.
 * Three visual states:
 *   • waiting    — dashed phone icon, "Waiting" label
 *   • connecting — solid outline + spinning RotateCw, "Connecting" label
 *   • connected  — player color fill + first-letter initial, player name label
 */
export function SlotCard({ slot, sizeVw = 5 }: SlotCardProps) {
  const labelByState: Record<SlotState, string> = {
    waiting: 'Waiting',
    connecting: 'Connecting',
    connected: slot.name ?? 'Player',
  };

  const circleStyle: React.CSSProperties = {
    width: `${sizeVw}vw`,
    height: `${sizeVw}vw`,
    borderRadius: '9999px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  return (
    <div className="flex flex-col items-center gap-[0.9vh] text-fg">
      {slot.state === 'waiting' && (
        <div
          style={{
            ...circleStyle,
            background: 'rgba(255,255,255,0.06)',
            border: '1.5px dashed rgba(255,255,255,0.3)',
          }}
        >
          <Smartphone
            style={{ width: `${sizeVw * 0.45}vw`, height: `${sizeVw * 0.45}vw` }}
            className="text-fg-muted"
          />
        </div>
      )}
      {slot.state === 'connecting' && (
        <div
          style={{
            ...circleStyle,
            background: 'rgba(255,255,255,0.06)',
            border: '1.5px solid rgba(255,255,255,0.6)',
          }}
        >
          <RotateCw
            style={{
              width: `${sizeVw * 0.45}vw`,
              height: `${sizeVw * 0.45}vw`,
              animation: 'weekend-slot-spin 1s linear infinite',
            }}
          />
        </div>
      )}
      {slot.state === 'connected' && (
        <div
          style={{
            ...circleStyle,
            background: slot.colorHex ?? 'rgba(255,255,255,0.12)',
            color: 'rgb(var(--palette-midnight-blue))',
            fontWeight: 800,
            fontSize: `${sizeVw * 0.45}vw`,
            lineHeight: 1,
          }}
        >
          {initial(slot.name ?? '?')}
        </div>
      )}
      <span
        className="uppercase tracking-wider text-fg-muted"
        style={{ fontSize: '0.9vw', fontFamily: 'var(--font-code)' }}
      >
        {labelByState[slot.state]}
      </span>
    </div>
  );
}
