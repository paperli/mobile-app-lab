// #demo: the whole funnel inside a phone frame, for presenting on a laptop.
// The frame runs the real pages (forced to mobile, arriving from TikTok); the
// side panel picks the game, shows where the viewer is, and restarts the flow.
import { useCallback, useEffect, useRef, useState } from 'react';
import { GAMES, asset } from '../config';
import { SEED_ACCOUNTS, getSession } from '../state';

const SESSION_KEY = 'funnel.session.v3';
const PHONE_W = 390;
const PHONE_H = 844;
const BEZEL = 12;

const STEPS: { key: string; label: string; match: (hash: string) => boolean }[] = [
  { key: 'ad', label: 'TikTok ad', match: (h) => h === '' || h.startsWith('ad') },
  { key: 'landing', label: 'Game landing page', match: (h) => h in GAMES || h.split('?')[0] in GAMES },
  { key: 'auth', label: 'Sign up / Sign in', match: (h) => h.startsWith('signup') || h.startsWith('signin') },
  { key: 'payment', label: 'Checkout', match: (h) => h.startsWith('payment') },
  { key: 'play', label: 'Play on Desktop | TV', match: (h) => h.startsWith('play') },
];

function frameUrl(game: string) {
  // A fresh query each time forces a real reload; the hash alone would not.
  return `./?device=mobile&src=tiktok&r=${Date.now()}#ad?game=${game}`;
}

function useClock() {
  const fmt = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M$/i, '');
  const [t, setT] = useState(fmt);
  useEffect(() => {
    const id = window.setInterval(() => setT(fmt()), 15000);
    return () => window.clearInterval(id);
  }, []);
  return t;
}

export function DemoPage() {
  const [game, setGame] = useState(() => getSession().game);
  const [src, setSrc] = useState(() => frameUrl(game));
  const [hash, setHash] = useState('ad');
  const [scale, setScale] = useState(1);
  const frame = useRef<HTMLIFrameElement>(null);
  const clock = useClock();

  useEffect(() => {
    document.title = 'Funnel demo';
    // On an actual phone the frame is redundant: run the flow full-screen.
    if (window.innerWidth < 760) location.replace(`./?src=tiktok#ad?game=${getSession().game}`);
  }, []);

  // Fit the phone to the window height.
  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerHeight - 48) / (PHONE_H + BEZEL * 2)));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  // Follow the frame's route (same origin) to light the current step.
  const watch = useCallback(() => {
    const w = frame.current?.contentWindow;
    if (!w) return;
    const read = () => setHash(w.location.hash.replace(/^#/, ''));
    read();
    w.addEventListener('hashchange', read);
  }, []);

  // Patch the shared session in storage (the frame owns it) and reload the
  // frame in place, so the flow keeps its progress.
  const [banner, setBanner] = useState<'cta' | 'about'>(() => getSession().appBanner);
  const placeBanner = (where: 'cta' | 'about') => {
    setBanner(where);
    try {
      const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...s, appBanner: where }));
    } catch {
      /* private mode */
    }
    frame.current?.contentWindow?.location.reload();
  };

  const restart = (g = game) => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* private mode */
    }
    setGame(g);
    setSrc(frameUrl(g));
  };

  const current = STEPS.findIndex((s) => s.match(hash));
  const onAd = current <= 0;

  return (
    <div className="demo">
      <aside className="demo-panel">
        <img className="demo-logo" src={asset('img/weekend-logo.svg')} alt="Weekend" />
        <h1>Paid-social funnel</h1>
        <p className="demo-lede">A TikTok ad through sign-up and checkout to playing, on a phone.</p>

        <section>
          <h2>Game</h2>
          <div className="demo-games">
            {Object.values(GAMES).map((g) => (
              <button key={g.id} type="button" aria-pressed={g.id === game} onClick={() => restart(g.id)}>
                {g.title}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2>Mobile app banner</h2>
          <div className="demo-games">
            <button type="button" aria-pressed={banner === 'cta'} onClick={() => placeBanner('cta')}>Below Join Now</button>
            <button type="button" aria-pressed={banner === 'about'} onClick={() => placeBanner('about')}>Below About</button>
          </div>
          <p className="demo-hint">Jeopardy!, Song Quiz and Spot On have mobile versions.</p>
        </section>

        <section>
          <h2>Flow</h2>
          <ol className="demo-steps">
            {STEPS.map((s, i) => (
              <li key={s.key} data-state={i < current ? 'done' : i === current ? 'now' : 'next'}>
                <span>{i + 1}</span>
                {s.label}
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2>Demo emails</h2>
          <ul className="demo-emails">
            <li>Any new email → <b>Sign up</b></li>
            {Object.entries(SEED_ACCOUNTS).map(([e, a]) => (
              <li key={e}>
                <code>{e}</code> → {a.subscribed ? <b>already subscribed</b> : <b>Sign in</b>}
              </li>
            ))}
            <li>Any password of 8+ characters. At checkout, tap <b>Fill test card</b>.</li>
          </ul>
        </section>

        <button type="button" className="demo-restart" onClick={() => restart()}>
          ↺ Restart from the ad
        </button>
      </aside>

      <div className="demo-stage">
        <div className="demo-phone" style={{ width: PHONE_W + BEZEL * 2, height: PHONE_H + BEZEL * 2, transform: `scale(${scale})` }}>
          <div className="demo-screen">
            <div className={`demo-status${onAd ? ' on-ad' : ''}`}>
              <span>{clock}</span>
              <span className="demo-island" />
              <span className="demo-icons" aria-hidden>
                <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1" /><rect x="4.5" y="5" width="3" height="6" rx="1" /><rect x="9" y="2.5" width="3" height="8.5" rx="1" /><rect x="13.5" y="0" width="3" height="11" rx="1" /></svg>
                <svg width="24" height="11" viewBox="0 0 24 11" fill="none"><rect x="0.5" y="0.5" width="20" height="10" rx="3" stroke="currentColor" opacity="0.5" /><rect x="2" y="2" width="15" height="7" rx="1.6" fill="currentColor" /><rect x="21.5" y="3.5" width="1.5" height="4" rx="0.7" fill="currentColor" opacity="0.5" /></svg>
              </span>
            </div>
            {/* TikTok opens ad links in its in-app browser; its bar sits above the page. */}
            {!onAd && (
              <div className="demo-inapp">
                <button type="button" aria-label="Back to TikTok" onClick={() => restart()}>✕</button>
                <div>
                  <b>Weekend</b>
                  <span>play.weekend.com</span>
                </div>
                <span className="demo-dots">•••</span>
              </div>
            )}
            <iframe ref={frame} title="Funnel on a phone" src={src} onLoad={watch} />
            <div className="demo-home" />
          </div>
        </div>
      </div>
    </div>
  );
}
