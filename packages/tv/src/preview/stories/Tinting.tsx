import { useState, useRef } from 'react';
import { Dialog, Button } from '@weekend/ui';

interface GameTint {
  name: string;
  tint: string;
  wash: string;
  wash2: string;
}

const GAMES: GameTint[] = [
  { name: 'Default (cyan/indigo)', tint: '49 204 242',   wash: '49 204 242',  wash2: '94 131 253'  },
  { name: 'Song Quiz (pink)',      tint: '255 79 178',   wash: '255 79 178',  wash2: '180 50 130'  },
  { name: 'Trivia (green)',        tint: '80 220 140',   wash: '80 220 140',  wash2: '40 120 80'   },
  { name: 'Storm (amber)',         tint: '255 170 50',   wash: '255 170 50',  wash2: '200 80 20'   },
];

function GameCard({
  game,
  open,
  onOpenChange,
}: {
  game: GameTint;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      style={{
        ['--modal-tint' as string]: game.tint,
        ['--modal-wash' as string]: game.wash,
        ['--modal-wash-2' as string]: game.wash2,
      }}
      className="p-6 rounded-card bg-bg-elevated flex flex-col gap-3 relative"
    >
      <h3 className="font-bold">{game.name}</h3>
      <Button onClick={() => onOpenChange(true)}>Open dialog</Button>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal container={ref.current}>
          <Dialog.Overlay />
          <Dialog.Content variant="backlit">
            <Dialog.Title className="text-2xl font-bold mb-2">{game.name}</Dialog.Title>
            <Dialog.Description className="text-fg-muted mb-4">
              Dialog tint scoped to game wrapper via CSS variables.
            </Dialog.Description>
            <Dialog.Close asChild>
              <Button variant="outline">Close</Button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

export default function TintingStory() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold">Per-game modal tinting</h2>
      <p className="text-fg-muted">
        Each wrapper scopes <code>--modal-tint</code>, <code>--modal-wash</code>, and{' '}
        <code>--modal-wash-2</code>. Same Dialog component, different game context.
      </p>
      <div className="grid grid-cols-2 gap-4">
        {GAMES.map((game, i) => (
          <GameCard
            key={game.name}
            game={game}
            open={openIdx === i}
            onOpenChange={(o) => setOpenIdx(o ? i : null)}
          />
        ))}
      </div>
    </div>
  );
}
