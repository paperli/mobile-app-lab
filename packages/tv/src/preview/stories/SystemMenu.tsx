import { useState } from 'react';
import { SystemMenuOverlay, Button, type Slot } from '@weekend/ui';

const MOCK_SLOTS: Slot[] = [
  { id: '1', state: 'connected',  name: 'Alex', colorHex: '#FFE88B' },
  { id: '2', state: 'connecting' },
  { id: '3', state: 'waiting' },
];

export default function SystemMenuStory() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold">SystemMenuOverlay</h2>
      <p className="text-fg-muted">
        L1 is three choices (D-pad with ← → or Tab). Pick Controllers to swap to L2.
      </p>
      <Button onClick={() => setOpen(true)}>Open System Menu</Button>
      <SystemMenuOverlay
        open={open}
        onOpenChange={setOpen}
        mobileUrl="https://localhost:5174?code=ABC123"
        roomCode="ABC123"
        slots={MOCK_SLOTS}
        onResume={() => console.log('Resume')}
        onExitGame={() => console.log('Exit')}
      />
    </div>
  );
}
