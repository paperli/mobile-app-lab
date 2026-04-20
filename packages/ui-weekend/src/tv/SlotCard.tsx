import { Check, Loader2 } from 'lucide-react';

export type SlotState = 'waiting' | 'connecting' | 'connected';

export interface Slot {
  id: string;
  state: SlotState;
  name?: string;
  colorHex?: string;
}

export interface SlotCardProps {
  slot: Slot;
}

export function SlotCard({ slot }: SlotCardProps) {
  return (
    <div
      data-state={slot.state}
      className={[
        'relative rounded-card p-4 flex items-center gap-3 transition-[background,border] duration-base',
        'data-[state=waiting]:border-2 data-[state=waiting]:border-dashed data-[state=waiting]:border-fg/30 data-[state=waiting]:bg-transparent data-[state=waiting]:text-fg-muted',
        'data-[state=connecting]:border-2 data-[state=connecting]:border-solid data-[state=connecting]:border-fg/60 data-[state=connecting]:bg-bg-elevated data-[state=connecting]:text-fg data-[state=connecting]:animate-[weekend-slot-pulse_1.2s_ease-in-out_infinite]',
        'data-[state=connected]:bg-bg-elevated data-[state=connected]:text-fg',
      ].join(' ')}
      style={
        slot.state === 'connected' && slot.colorHex
          ? { boxShadow: `inset 0 0 0 2px ${slot.colorHex}` }
          : undefined
      }
    >
      {slot.state === 'waiting' && (
        <span className="text-sm">Open slot</span>
      )}
      {slot.state === 'connecting' && (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Connecting…</span>
        </>
      )}
      {slot.state === 'connected' && (
        <>
          <Check className="w-5 h-5" />
          <span className="font-medium">{slot.name ?? 'Player'}</span>
        </>
      )}
    </div>
  );
}
