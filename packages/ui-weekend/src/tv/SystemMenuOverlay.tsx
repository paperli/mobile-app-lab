import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Gamepad2, X } from 'lucide-react';
import { Dialog } from '../primitives/Dialog';
import { ControllersPanel } from './ControllersPanel';
import type { Slot } from './SlotCard';

export interface SystemMenuOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mobileUrl: string;
  roomCode: string;
  slots: Slot[];
  onResume: () => void;
  onExitGame: () => void;
}

type Panel = 'root' | 'controllers';

interface MenuItem {
  key: string;
  icon: ReactNode;
  label: string;
  onSelect: () => void;
}

export function SystemMenuOverlay({
  open,
  onOpenChange,
  mobileUrl,
  roomCode,
  slots,
  onResume,
  onExitGame,
}: SystemMenuOverlayProps) {
  const [panel, setPanel] = useState<Panel>('root');
  const [focusIdx, setFocusIdx] = useState(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Reset to root when closing
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setPanel('root');
        setFocusIdx(0);
      }, 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  const items: MenuItem[] = [
    { key: 'resume',      icon: <ArrowLeft className="w-8 h-8" />, label: 'Resume',     onSelect: () => { onOpenChange(false); onResume(); } },
    { key: 'controllers', icon: <Gamepad2 className="w-8 h-8" />,  label: 'Controllers',onSelect: () => setPanel('controllers') },
    { key: 'exit',        icon: <X className="w-8 h-8" />,         label: 'Exit Game',  onSelect: () => { onOpenChange(false); onExitGame(); } },
  ];

  // Roving focus on L1
  useEffect(() => {
    if (panel !== 'root' || !open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setFocusIdx((i) => (i + 1) % items.length);
      if (e.key === 'ArrowLeft')  setFocusIdx((i) => (i - 1 + items.length) % items.length);
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        items[focusIdx]?.onSelect();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel, open, focusIdx]);

  useEffect(() => {
    if (panel === 'root') itemRefs.current[focusIdx]?.focus();
  }, [focusIdx, panel]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content variant="backlit">
          <Dialog.Title className="sr-only">System menu</Dialog.Title>
          {panel === 'root' ? (
            <div className="flex gap-6 justify-center py-8">
              {items.map((item, i) => (
                <button
                  key={item.key}
                  ref={(el) => { itemRefs.current[i] = el; }}
                  onClick={item.onSelect}
                  className="flex flex-col items-center gap-3 p-6 rounded-card transition-colors focus:outline-none focus:bg-fg/10 min-w-[160px]"
                >
                  <div className="w-16 h-16 rounded-pill bg-fg/10 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <span className="text-lg font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <ControllersPanel
              mobileUrl={mobileUrl}
              roomCode={roomCode}
              slots={slots}
              onBack={() => setPanel('root')}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
