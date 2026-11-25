// Prototype-only controls: jump to a screen, force a device, switch offer,
// reset. Nothing here is product UI.
import { useEffect, useState } from 'react';
import { GAMES, LOOKS, OFFERS, type OfferId } from './config';
import { hubUrl, navigate, type RouteName } from './router';
import { IN_FRAME, SEED_ACCOUNTS, clearAccounts, resetSession, setSession, useSession, type Session } from './state';

const SCREENS: { label: string; to: string }[] = [
  { label: 'TikTok ad', to: 'ad' },
  { label: 'Landing', to: 'jeopardy' },
  { label: 'Sign up', to: 'signup' },
  { label: 'Sign in', to: 'signin' },
  { label: 'Checkout', to: 'payment' },
  { label: 'Play · Desktop', to: 'play?tab=desktop' },
  { label: 'Play · TV', to: 'play?tab=tv' },
];

const OPEN_EVENT = 'funnel:proto-open';

/** The Proto button as it sits in a Weekend page header. */
export function ProtoButton() {
  if (IN_FRAME) return null;
  return (
    <button type="button" className="proto-fab inline" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))} aria-haspopup="dialog">
      Proto
    </button>
  );
}

export function ProtoSheet({ route }: { route: RouteName }) {
  const s = useSession();
  const [open, setOpen] = useState(false);
  // Weekend pages (landing, play) put the button in their header (ProtoButton);
  // prod screens get it in the nav's empty right side.
  const inHeader = route === 'landing' || route === 'play';
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);

  // Jumping ahead needs the state that screen expects.
  const jump = (to: string) => {
    const base = to.split('?')[0];
    if (base === 'payment' && !s.user) setSession({ user: s.email || 'player@weekend.com', email: s.email || 'player@weekend.com', subscribed: false });
    if (base === 'play' && !s.subscribed) setSession({ user: s.user ?? 'player@weekend.com', subscribed: true });
    if ((base === 'signup' || base === 'signin') && s.subscribed) setSession({ subscribed: false, user: null });
    setOpen(false);
    navigate(to);
  };

  return (
    <>
      {!inHeader && (
        <button type="button" className="proto-fab nav" onClick={() => setOpen(true)} aria-haspopup="dialog">
          Proto
        </button>
      )}
      {open && (
        <>
          <div className="proto-scrim" onClick={() => setOpen(false)} />
          <div className="proto-sheet" role="dialog" aria-label="Prototype controls">
            <div className="proto-group">
              <h3>Jump to</h3>
              <div className="proto-opts">
                {SCREENS.map((x) => (
                  <button key={x.to} type="button" onClick={() => jump(x.to)}>{x.label}</button>
                ))}
                <a href="#demo">Phone demo ↗</a>
                <a href={hubUrl('desktop')}>Desktop hub</a>
                <a href={hubUrl('tv')}>TV hub</a>
              </div>
            </div>
            <div className="proto-group">
              <h3>Game</h3>
              <div className="proto-opts">
                {Object.values(GAMES).map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    aria-pressed={s.game === g.id}
                    onClick={() => {
                      setSession({ game: g.id });
                      setOpen(false);
                      navigate(route === 'ad' ? 'ad' : g.id);
                    }}
                  >
                    {g.title}
                  </button>
                ))}
              </div>
            </div>
            <div className="proto-group">
              <h3>Mobile app banner (Jeopardy!, Song Quiz, Spot On)</h3>
              <div className="proto-opts">
                <button type="button" aria-pressed={s.appBanner === 'cta'} onClick={() => setSession({ appBanner: 'cta' })}>Below Join Now</button>
                <button type="button" aria-pressed={s.appBanner === 'about'} onClick={() => setSession({ appBanner: 'about' })}>Below About the game</button>
              </div>
            </div>
            <div className="proto-group">
              <h3>Device</h3>
              <div className="proto-opts">
                {(['auto', 'mobile', 'desktop'] as Session['device'][]).map((d) => (
                  <button key={d} type="button" aria-pressed={s.device === d} onClick={() => setSession({ device: d })}>
                    {d[0].toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="proto-group">
              <h3>Look · page hue + video frame</h3>
              <div className="proto-opts">
                {LOOKS.map((l) => (
                  <button key={l.id} type="button" aria-pressed={s.look === l.id} onClick={() => setSession({ look: l.id })}>
                    {l.name}
                  </button>
                ))}
                <button type="button" onClick={() => jump('looks')}>Compare all →</button>
              </div>
            </div>
            <div className="proto-group">
              <h3>Offer</h3>
              <div className="proto-opts">
                {(Object.keys(OFFERS) as OfferId[]).map((o) => (
                  <button key={o} type="button" aria-pressed={s.offer === o} onClick={() => setSession({ offer: o })}>
                    {OFFERS[o].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="proto-group">
              <h3>Demo emails</h3>
              <ul className="proto-emails">
                {Object.entries(SEED_ACCOUNTS).map(([email, a]) => (
                  <li key={email}>
                    <code>{email}</code> → {a.subscribed ? 'subscribed, skips checkout' : 'has account → sign in'}
                  </li>
                ))}
                <li>Any other email → sign up</li>
              </ul>
            </div>
            <div className="proto-group">
              <h3>Reset</h3>
              <div className="proto-opts">
                <button
                  type="button"
                  onClick={() => {
                    resetSession();
                    setOpen(false);
                    navigate('ad');
                  }}
                >
                  Restart flow
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearAccounts();
                    resetSession();
                    setOpen(false);
                    navigate('ad');
                  }}
                >
                  Forget sign-ups too
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
