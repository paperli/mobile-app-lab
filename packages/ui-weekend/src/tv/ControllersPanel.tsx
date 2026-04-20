import { ArrowLeft } from 'lucide-react';
import { QRCard } from './QRCard';
import { RoomCodeDisplay } from './RoomCodeDisplay';
import { SlotCard, type Slot } from './SlotCard';
import { Button } from '../primitives/Button';

export interface ControllersPanelProps {
  mobileUrl: string;
  roomCode: string;
  slots: Slot[];
  onBack: () => void;
}

export function ControllersPanel({ mobileUrl, roomCode, slots, onBack }: ControllersPanelProps) {
  return (
    <div className="flex flex-col gap-6 w-full">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-2xl font-bold">Controllers</h2>
      </header>
      <div className="grid grid-cols-[auto_1fr] gap-8">
        <div className="flex flex-col gap-4 items-center">
          <QRCard url={mobileUrl} />
          <RoomCodeDisplay code={roomCode} />
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-sm uppercase tracking-widest text-fg-muted">Slots</h3>
          <div className="grid grid-cols-2 gap-3">
            {slots.map((s) => (
              <SlotCard key={s.id} slot={s} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
