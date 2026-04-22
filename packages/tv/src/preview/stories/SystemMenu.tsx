import { useState } from 'react';
import {
  SystemMenuOverlay,
  Button,
  type Slot,
  type ExitAction,
  type ExitTabContent,
} from '@weekend/ui';

const MOCK_SLOTS: Slot[] = [
  { id: '1', state: 'connected',  name: 'Alex', colorHex: '#FFE88B' },
  { id: '2', state: 'connecting' },
  { id: '3', state: 'waiting' },
];

const CONFIRM_EXIT: ExitTabContent = {
  variant: 'confirm',
  title: 'Leave the app?',
  description: "You'll exit Weekend and return to your TV's home screen.",
};

const TILES_EXIT: ExitTabContent = {
  variant: 'tiles',
  prompt: 'Are you sure you want to exit?',
  actions: [
    { id: 'exit',      label: 'Exit Game',  kind: 'exit' },
    { id: 'wits-end',  label: "Wit's End",  kind: 'launch', title: "Wit's End",  backgroundColor: '#8B5CF6' },
    { id: 'sports',    label: 'Sports Arena', kind: 'launch', title: 'Sports Arena', backgroundColor: '#FFA07A' },
    { id: 'adventure', label: 'Adventure World', kind: 'launch', title: 'Adventure World', backgroundColor: '#45B7D1' },
  ],
};

const MODE_SWAP_EXIT: ExitTabContent = {
  variant: 'tiles',
  prompt: 'Are you sure you want to exit?',
  actions: [
    { id: 'exit', label: 'Exit Game',    kind: 'exit' },
    { id: 'pop',  label: 'Pop Hits',     kind: 'launch' },
    { id: '80s',  label: '80s Classics', kind: 'launch' },
    { id: 'rnb',  label: 'R&B Anthems',  kind: 'launch' },
  ],
};

type Variant = 'confirm' | 'tiles' | 'mode-swap';

export default function SystemMenuStory() {
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState<Variant>('confirm');

  const exitTab =
    variant === 'confirm' ? CONFIRM_EXIT :
    variant === 'tiles'   ? TILES_EXIT :
    MODE_SWAP_EXIT;

  const handleExitAction = (action: ExitAction) => {
    console.log('[SystemMenu story] exit action:', action);
  };

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold">SystemMenuOverlay</h2>
      <p className="text-fg-muted">
        L1 tab row at the bottom (← / → to move, ↓ from Exit tab dives into L2).
        L2 content layer holds the Exit tab's actions (← / →, Enter to activate, ↑ returns).
      </p>
      <div className="flex items-center gap-3">
        <label className="text-sm uppercase tracking-widest text-fg-muted">Exit variant:</label>
        <select
          value={variant}
          onChange={(e) => setVariant(e.target.value as Variant)}
          className="bg-bg-elevated text-fg rounded-card px-3 py-2 text-sm"
        >
          <option value="confirm">confirm (hub)</option>
          <option value="tiles">tiles (launch other games)</option>
          <option value="mode-swap">tiles (swap game mode)</option>
        </select>
      </div>
      <Button onClick={() => setOpen(true)}>Open System Menu</Button>
      <SystemMenuOverlay
        open={open}
        onOpenChange={setOpen}
        mobileUrl="https://localhost:5174?code=ABC123"
        roomCode="ABC123"
        slots={MOCK_SLOTS}
        exitTab={exitTab}
        onResume={() => console.log('Resume')}
        onExitAction={handleExitAction}
      />
    </div>
  );
}
