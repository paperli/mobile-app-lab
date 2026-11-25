// Signed-in account control: a colored circle with the email's first letter.
// Tap (mobile) or hover (desktop) opens Manage Account / Sign Out; Sign Out
// asks for confirmation first.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { landing, navigate } from '../router';
import { setSession } from '../state';

// Picked per email so the same account always gets the same color.
const COLORS = ['#ff6b6b', '#ffb020', '#3ddc97', '#2bd4ff', '#8a7dff', '#ff4fa3', '#4f7bff', '#f97316'];
function colorFor(email: string) {
  let h = 0;
  for (const c of email) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

const canHover = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export function AccountMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  // Tap outside closes the menu.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const signOut = () => {
    setConfirm(false);
    setSession({ user: null, subscribed: false, email: '' });
    navigate(landing(), { replace: true });
  };

  return (
    <>
      <div
        ref={wrap}
        className="acct"
        onMouseEnter={() => canHover() && setOpen(true)}
        onMouseLeave={() => canHover() && setOpen(false)}
      >
        <button
          type="button"
          className="acct-avatar"
          style={{ background: colorFor(email) }}
          aria-label={`Account: ${email}`}
          aria-haspopup="menu"
          aria-expanded={open}
          // With a mouse, hover already opened it; a click shouldn't toggle it shut.
          onClick={() => setOpen((o) => (canHover() ? true : !o))}
        >
          {email[0]?.toUpperCase()}
        </button>
        {open && (
          <div className="acct-menu" role="menu">
            <div className="acct-email">{email}</div>
            <button type="button" role="menuitem" className="acct-item" onClick={() => setOpen(false)}>
              Manage Account
            </button>
            <button
              type="button"
              role="menuitem"
              className="acct-item is-danger"
              onClick={() => {
                setOpen(false);
                setConfirm(true);
              }}
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Portaled: the header's backdrop-filter would otherwise trap position:fixed. */}
      {confirm && createPortal(
        <div className="modal-scrim" onClick={() => setConfirm(false)}>
          <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="so-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="so-title">Sign out?</h2>
            <p>You'll need to sign in again to play.</p>
            <div className="modal-actions">
              <button type="button" className="wk-btn-ghost" onClick={() => setConfirm(false)}>
                Cancel
              </button>
              <button type="button" className="btn-danger" onClick={signOut} autoFocus>
                Sign Out
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
