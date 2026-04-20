import { QRCard, RoomCodeDisplay, SlotCard, ControllersPanel, type Slot } from '@weekend/ui';

const SLOTS: Slot[] = [
  { id: '1', state: 'connected',  name: 'Alex', colorHex: '#FFE88B' },
  { id: '2', state: 'connecting' },
  { id: '3', state: 'waiting' },
  { id: '4', state: 'waiting' },
];

export default function ControllersStory() {
  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="text-xl font-bold mb-3">QRCard</h2>
        <QRCard url="https://localhost:5174?code=ABC123" />
      </section>
      <section>
        <h2 className="text-xl font-bold mb-3">RoomCodeDisplay</h2>
        <RoomCodeDisplay code="ABC123" />
      </section>
      <section>
        <h2 className="text-xl font-bold mb-3">SlotCard (all states)</h2>
        <div className="grid grid-cols-2 gap-3 max-w-xl">
          {SLOTS.map((s) => (
            <SlotCard key={s.id} slot={s} />
          ))}
        </div>
      </section>
      <section>
        <h2 className="text-xl font-bold mb-3">ControllersPanel (composed)</h2>
        <ControllersPanel
          mobileUrl="https://localhost:5174?code=ABC123"
          roomCode="ABC123"
          slots={SLOTS}
          onBack={() => alert('Back clicked')}
        />
      </section>
    </div>
  );
}
