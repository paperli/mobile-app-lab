import { useRef, useState } from 'react';
import { Wand2, X } from 'lucide-react';
import { HapticFeedback } from '../../utils/haptics';
import { DevelopChat, type ChatMsg } from './DevelopChat';

const CANARY = 'rgb(var(--palette-canary-500))';
const FAB = 62;
const DRAG_THRESHOLD = 6; // px before a press becomes a drag
const CLOSE_THRESHOLD = 120; // px swipe-down to dismiss the sheet

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * A draggable floating "wand" button that opens the Develop chat in a bottom
 * sheet. Persistent across the Studio game screens so the game can be iterated
 * at any time. The sheet closes via the top-left button or a swipe-down on its
 * header (the chat log scrolls independently, so the two don't conflict).
 */
export function DevelopFab({
  log,
  onSend,
  onVoiceState,
  showHint = false,
  onHintDismiss,
  onOpenChange,
}: {
  log: ChatMsg[];
  onSend: (text: string) => void;
  onVoiceState: (state: 'idle' | 'listening') => void;
  /** Show a one-time "Click here to develop" tooltip pointing at the button. */
  showHint?: boolean;
  /** Called when the button is clicked or dragged, so the hint can be cleared. */
  onHintDismiss?: () => void;
  /** Fired when the Develop sheet opens (true) or closes (false). */
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(() => ({
    x: (typeof window !== 'undefined' ? window.innerWidth : 400) - FAB - 12,
    y: (typeof window !== 'undefined' ? window.innerHeight : 800) - FAB - 80,
  }));

  // FAB drag vs tap
  const fabDrag = useRef<{ px: number; py: number; ox: number; oy: number; moved: boolean } | null>(null);
  const onFabDown = (e: React.PointerEvent) => {
    // Any interaction (tap or drag start) dismisses the hint.
    onHintDismiss?.();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    fabDrag.current = { px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y, moved: false };
  };
  const onFabMove = (e: React.PointerEvent) => {
    const s = fabDrag.current;
    if (!s) return;
    const dx = e.clientX - s.px;
    const dy = e.clientY - s.py;
    if (!s.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) s.moved = true;
    if (s.moved) {
      setPos({
        x: clamp(s.ox + dx, 8, window.innerWidth - FAB - 8),
        y: clamp(s.oy + dy, 8, window.innerHeight - FAB - 8),
      });
    }
  };
  const onFabUp = () => {
    const s = fabDrag.current;
    fabDrag.current = null;
    if (s && !s.moved) {
      HapticFeedback.medium();
      setOpen(true);
      onOpenChange?.(true);
    }
  };

  // Sheet swipe-to-close (header only)
  const [sheetY, setSheetY] = useState(0);
  const [sheetDragging, setSheetDragging] = useState(false);
  const sheetDrag = useRef<number | null>(null);
  const close = () => {
    setOpen(false);
    setSheetY(0);
    setSheetDragging(false);
    onOpenChange?.(false);
  };
  const onHeaderDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    sheetDrag.current = e.clientY;
    setSheetDragging(true);
  };
  const onHeaderMove = (e: React.PointerEvent) => {
    if (sheetDrag.current == null) return;
    setSheetY(Math.max(0, e.clientY - sheetDrag.current));
  };
  const onHeaderUp = () => {
    if (sheetDrag.current == null) return;
    sheetDrag.current = null;
    setSheetDragging(false);
    if (sheetY > CLOSE_THRESHOLD) close();
    else setSheetY(0);
  };

  return (
    <>
      {showHint && !open && (
        <div
          style={{
            position: 'fixed',
            right: window.innerWidth - pos.x + 14,
            top: pos.y + FAB / 2,
            transform: 'translateY(-50%)',
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
            animation: 'devHintBob 1.15s ease-in-out infinite',
          }}
        >
          <div
            style={{
              background: CANARY,
              color: '#1a1400',
              fontSize: 14,
              fontWeight: 800,
              padding: '10px 14px',
              borderRadius: 12,
              whiteSpace: 'nowrap',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            Click here to develop
          </div>
          <div
            style={{
              width: 0,
              height: 0,
              borderTop: '7px solid transparent',
              borderBottom: '7px solid transparent',
              borderLeft: `9px solid ${CANARY}`,
            }}
          />
          <style>{`@keyframes devHintBob { 0%,100% { transform: translateY(-50%) translateX(0); } 50% { transform: translateY(-50%) translateX(5px); } }`}</style>
        </div>
      )}

      <button
        aria-label="Develop your game"
        onPointerDown={onFabDown}
        onPointerMove={onFabMove}
        onPointerUp={onFabUp}
        onPointerCancel={onFabUp}
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          width: FAB,
          height: FAB,
          borderRadius: '50%',
          border: 'none',
          background: CANARY,
          color: '#1a1400',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 28px rgba(255,218,10,0.4), 0 2px 8px rgba(0,0,0,0.35)',
          zIndex: 9997,
          touchAction: 'none',
          WebkitTapHighlightColor: 'transparent',
          cursor: 'grab',
        }}
      >
        <Wand2 size={28} strokeWidth={2.2} />
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10001 }}>
          <style>{`
            @keyframes devSheetIn { from { transform: translateY(100%) } to { transform: translateY(0) } }
            @keyframes devBackdropIn { from { opacity: 0 } to { opacity: 1 } }
          `}</style>
          <div
            onClick={close}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', animation: 'devBackdropIn 220ms ease both' }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: '82%',
              background: '#0f0a24',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              boxShadow: '0 -12px 40px rgba(0,0,0,0.5)',
              transform: `translateY(${sheetY}px)`,
              transition: sheetDragging ? 'none' : 'transform 240ms cubic-bezier(0.4,0,0.2,1)',
              // Entrance pop: slide up from the bottom on open.
              animation: 'devSheetIn 360ms cubic-bezier(0.2,0.9,0.2,1) both',
              display: 'flex',
              flexDirection: 'column',
              padding: '0 16px max(env(safe-area-inset-bottom), 16px)',
              boxSizing: 'border-box',
              color: '#F3F4F1',
              fontFamily: "'Weekend Repro', ui-sans-serif, system-ui, sans-serif",
            }}
          >
            {/* Header — the swipe-to-close zone */}
            <div
              onPointerDown={onHeaderDown}
              onPointerMove={onHeaderMove}
              onPointerUp={onHeaderUp}
              onPointerCancel={onHeaderUp}
              style={{ paddingTop: 12, touchAction: 'none', cursor: 'grab' }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  onClick={close}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label="Close"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#F3F4F1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={22} strokeWidth={2.4} />
                </button>
                <div style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: 800 }}>Develop</div>
                <div style={{ width: 40 }} />
              </div>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.28)', margin: '10px auto 6px' }} />
            </div>

            <DevelopChat log={log} onSend={onSend} onVoiceState={onVoiceState} />
          </div>
        </div>
      )}
    </>
  );
}
