// After checkout on a phone: how to get playing. Desktop | TV segmented
// control. The TV tab is a web version of the iOS app's "One screen" setup
// guide (weekend-games-ios PlayOnTVView .setupGuide, TVSetupInstructions,
// TVPairingActions); copy is verbatim from there.
import { useEffect, useState } from 'react';
import { PLAY_DOMAIN, asset } from '../config';
import { hubUrl, shareUrl } from '../router';
import { IN_FRAME, useGame, useLook } from '../state';

/** Inside the demo's phone frame, the hubs open full-size in the window. */
const HUB_TARGET = IN_FRAME ? '_top' : undefined;
import { WkHeader } from './WkHeader';
import { Backdrop } from './Backdrop';

type Tab = 'desktop' | 'tv';

export function PlayPage({ initialTab }: { initialTab: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const look = useLook();
  const GAME = useGame();
  useEffect(() => {
    document.title = `Play ${GAME.title} | Weekend`;
  }, []);
  const pick = (t: Tab) => {
    setTab(t);
    history.replaceState(null, '', `#play?tab=${t}`);
  };
  return (
    <div className="wk" data-look={look}>
      <Backdrop poster={GAME.poster} />
      <WkHeader />
      <main className="pl">
        <div className="pl-seg">
          <div className="seg" role="tablist" aria-label="Where to play">
            <span className="seg-thumb" style={{ transform: tab === 'tv' ? 'translateX(100%)' : 'none' }} />
            <button type="button" role="tab" aria-selected={tab === 'desktop'} onClick={() => pick('desktop')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M2 20h20" /></svg>
              Desktop
            </button>
            <button type="button" role="tab" aria-selected={tab === 'tv'} onClick={() => pick('tv')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="4" width="19" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
              TV
            </button>
          </div>
        </div>
        {tab === 'desktop' ? <DesktopTab /> : <TvTab />}
      </main>
    </div>
  );
}

// ── Desktop ────────────────────────────────────────────────────────────────

function DesktopTab() {
  const GAME = useGame();
  const [toast, setToast] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);
  const link = shareUrl();
  const shareText = `Play ${GAME.title} on Weekend: ${link}`;

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setToast('Link copied');
      return true;
    } catch {
      return false;
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Play ${GAME.title} on Weekend`, text: `Open this on your PC or Mac to play ${GAME.title}.`, url: link });
        return;
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') return;
      }
    }
    // In-app browsers often have no Web Share; copy, then offer text/email.
    await copy();
    setFallback(true);
  };

  return (
    <>
      <div className="laptop" aria-hidden>
        <div className="laptop-lid">
          <div className="laptop-screen">
            <div className="hero" style={{ backgroundImage: `url(${GAME.hero})` }} />
            <div className="bar" />
            <div className="rows">
              {['song-quiz', 'wheel-of-fortune', 'spot-on', 'wits-end'].map((g) => (
                <i key={g} style={{ backgroundImage: `url(${asset(`img/tiles/${g}.webp`)})` }} />
              ))}
            </div>
          </div>
        </div>
        <div className="laptop-base" />
      </div>

      <h1 className="pl-title is-center">
        Open Weekend on your <em>PC or Mac.</em>
      </h1>

      <div className="pl-url">
        <span>{PLAY_DOMAIN}</span>
        <button type="button" className="pl-copy" onClick={() => void copy().then((ok) => !ok && setFallback(true))}>
          Copy
        </button>
      </div>

      <button type="button" className="wk-btn" onClick={() => void share()}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v13M7 8l5-5 5 5" /><path d="M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6" /></svg>
        Share link
      </button>
      {fallback && (
        <div className="pl-fallback">
          <a className="wk-btn-ghost" href={`sms:?&body=${encodeURIComponent(shareText)}`}>Text it</a>
          <a className="wk-btn-ghost" href={`mailto:?subject=${encodeURIComponent(`Play ${GAME.title} on Weekend`)}&body=${encodeURIComponent(shareText)}`}>Email it</a>
        </div>
      )}
      <a className="pl-link" href={hubUrl('desktop')} target={HUB_TARGET}>Preview the desktop hub (prototype)</a>
      {toast && <div className="pl-toast" role="status">{toast}</div>}
    </>
  );
}

// ── TV ─────────────────────────────────────────────────────────────────────

type PlatId = 'roku' | 'fire' | 'samsung' | 'lg';
interface Plat {
  id: PlatId;
  name: string;
  /** Who shows the paywall on Roku / Fire TV (TVSetupInstructions.swift:17). */
  brand?: string;
  bg: string;
  accent: string;
  logo: string;
  tvLogoH: number;
  chip: { w: number; h: number };
}
// weekend-games-ios docs/design/mockup/live/mobile.dc.html CONN_PLATS
const PLATS: Plat[] = [
  { id: 'roku', name: 'Roku', brand: 'Roku', bg: '#2a1548', accent: '#9b6dff', logo: asset('platforms/roku.svg'), tvLogoH: 13, chip: { w: 52, h: 18 } },
  { id: 'fire', name: 'Fire TV', brand: 'Amazon', bg: '#0f1d33', accent: '#00A8E1', logo: asset('platforms/fire-tv.svg'), tvLogoH: 15, chip: { w: 50, h: 22 } },
  { id: 'samsung', name: 'Samsung', bg: '#0c0f1c', accent: '#3d63ff', logo: asset('platforms/samsung.svg'), tvLogoH: 9, chip: { w: 66, h: 12 } },
  { id: 'lg', name: 'LG', bg: '#1c0a14', accent: '#e0154a', logo: asset('platforms/lg-white.svg'), tvLogoH: 13, chip: { w: 38, h: 19 } },
];

type Scene = 'search' | 'back' | 'pair' | 'qr';
interface Step {
  scene: Scene;
  title: string;
  detail?: string;
}

function stepsFor(p: Plat): Step[] {
  const steps: Step[] = [{ scene: 'search', title: 'Search for Weekend', detail: 'Home → Search, then type Weekend.' }];
  if (p.brand) {
    steps.push({ scene: 'back', title: `When ${p.brand} asks you to subscribe, press Back on your TV remote.` });
    steps.push({ scene: 'pair', title: 'Tap Pair in the top right corner.' });
  }
  steps.push({ scene: 'qr', title: 'Scan the QR code.' });
  return steps;
}

const STEP_MS = 2600;

function TvTab() {
  const [platId, setPlatId] = useState<PlatId>('roku');
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [scanHelp, setScanHelp] = useState(false);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const plat = PLATS.find((p) => p.id === platId)!;
  const steps = stepsFor(plat);

  useEffect(() => setActive(0), [platId]);
  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => setActive((a) => (a + 1) % steps.length), STEP_MS);
    return () => window.clearInterval(t);
  }, [paused, steps.length, platId]);

  const codeOk = code.length === 4 || code.length === 6;
  const submit = () => {
    if (!codeOk) {
      setStatus('error');
      return;
    }
    setStatus('connecting');
    window.setTimeout(() => setStatus('connected'), 1200);
  };

  const scene = steps[active]?.scene ?? 'search';

  if (status === 'connected') {
    return (
      <div className="connected" role="status">
        <b>Connected!</b>
        <span className="pl-sub">Your TV will unlock in a moment.</span>
        <a className="wk-btn" href={hubUrl('tv')} target={HUB_TARGET}>See it on your TV (prototype)</a>
        <button type="button" className="pl-link" onClick={() => { setStatus('idle'); setCode(''); }}>
          Connect another TV
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="chips" role="group" aria-label="Your TV">
        {PLATS.map((p) => (
          <button key={p.id} type="button" className="chip" aria-pressed={p.id === platId} onClick={() => setPlatId(p.id)} aria-label={p.name}>
            <img
              src={p.id === 'lg' ? asset(p.id === platId ? 'platforms/lg-selected.svg' : 'platforms/lg-white.svg') : p.logo}
              className={p.id === 'lg' ? 'lg' : undefined}
              alt=""
              style={{ maxWidth: p.chip.w, maxHeight: p.chip.h }}
            />
          </button>
        ))}
      </div>

      <TvIllustration plat={plat} scene={scene} />

      <div className="steps" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        {steps.map((s, i) => (
          <button
            key={s.title}
            type="button"
            className="step-row"
            data-active={i === active}
            onClick={() => {
              setActive(i);
              setPaused(true);
            }}
          >
            <span className="step-n">{i + 1}</span>
            <span>
              <span className="step-t">{s.title}</span>
              {s.detail && <span className="step-d" style={{ display: 'block' }}>{s.detail}</span>}
            </span>
          </button>
        ))}
      </div>

      <div className="pair">
        <button type="button" className="wk-btn" style={{ height: 60 }} onClick={() => setScanHelp(!scanHelp)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#261633" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2" /><path d="M3.5 12h17" strokeWidth="1.6" /></svg>
          Scan and play
        </button>
        {scanHelp && (
          <div className="scan-help" role="note">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffda0a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: '0 0 auto', marginTop: 1 }}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
            <span>
              <b style={{ display: 'block', color: '#f3f4f1' }}>Point your camera at the code on your TV</b>
              Open your phone's Camera app and scan the QR code on the Weekend screen. It opens Weekend and connects your TV.
            </span>
          </div>
        )}
        <div className="or"><span>Or enter code</span></div>
        <div className="code-row">
          <label htmlFor="tv-code" className="sr">Enter code</label>
          <input
            id="tv-code"
            className="code-in"
            value={code}
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            placeholder="Enter code"
            onChange={(e) => {
              setCode(e.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6));
              if (status === 'error') setStatus('idle');
            }}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <button type="button" className="code-go" disabled={!codeOk || status === 'connecting'} onClick={submit} aria-label="Connect">
            {status === 'connecting' ? (
              <span className="pc-spinner" />
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#261633" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            )}
          </button>
        </div>
        {status === 'connecting' && <p className="code-msg">Connecting your TV…</p>}
        {status === 'error' && (
          <p className="code-msg err">That code doesn't look right — codes are 4 or 6 characters. Check your TV and try again.</p>
        )}
      </div>
    </>
  );
}

function TvIllustration({ plat, scene }: { plat: Plat; scene: Scene }) {
  const qr = (
    <svg viewBox="0 0 25 25" width="100%" height="100%">
      <g fill="#0a0322">
        <path fillRule="evenodd" d="M2 2h7v7H2zM3.5 3.5v4h4v-4z" /><rect x="4.5" y="4.5" width="2" height="2" />
        <path fillRule="evenodd" d="M16 2h7v7h-7zM17.5 3.5v4h4v-4z" /><rect x="18.5" y="4.5" width="2" height="2" />
        <path fillRule="evenodd" d="M2 16h7v7H2zM3.5 17.5v4h4v-4z" /><rect x="4.5" y="18.5" width="2" height="2" />
        <rect x="11" y="2.5" width="1.6" height="1.6" /><rect x="13.4" y="4.6" width="1.6" height="1.6" /><rect x="11" y="6.7" width="1.6" height="1.6" />
        <rect x="11.2" y="11" width="1.6" height="1.6" /><rect x="14" y="12.4" width="1.6" height="1.6" /><rect x="17.4" y="13.8" width="1.6" height="1.6" />
        <rect x="20.6" y="11.2" width="1.6" height="1.6" /><rect x="12.6" y="16.6" width="1.6" height="1.6" /><rect x="15.6" y="19.4" width="1.6" height="1.6" />
        <rect x="19.4" y="17.4" width="1.6" height="1.6" /><rect x="21.6" y="20.6" width="1.6" height="1.6" />
      </g>
    </svg>
  );
  const tiles = ['tiles/jeopardy', 'tiles/song-quiz', 'tiles/wheel-of-fortune', 'tiles/wits-end', 'tiles/spot-on', 'tiles/sketchy-af', 'tiles/guess-the-emoji'];
  return (
    <div className="tv" aria-hidden>
      <div className="tv-frame">
        <div className="tv-screen" style={{ background: plat.bg }}>
          {/* 1 · platform home, searching */}
          <div className="tv-scene" data-on={scene === 'search'}>
            <img className="tv-os-logo" src={plat.logo} alt="" style={{ height: plat.tvLogoH, width: 'auto', filter: plat.id === 'lg' ? 'none' : undefined }} />
            <div className="tv-search" style={{ boxShadow: `0 0 0 2px ${plat.accent}` }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              Weekend
            </div>
            <div className="tv-results">
              <i className="wk-tile"><span style={{ boxShadow: `0 0 0 2px ${plat.accent}` }}><img src={asset('img/weekend-mark.svg')} alt="" /></span>Weekend</i>
              <i /><i /><i />
            </div>
          </div>
          {/* 2 · platform paywall → press Back */}
          <div className="tv-scene tv-paywall" data-on={scene === 'back'}>
            <span className="bar" style={{ top: 12, width: 74, background: 'rgba(255,255,255,.22)' }} />
            <div className="tv-yellow" style={{ position: 'absolute', top: 28, left: 12, width: 64, height: 36 }}><img src={asset('img/weekend-mark.svg')} alt="" /></div>
            <span className="bar" style={{ top: 74, width: 96 }} />
            <span className="bar" style={{ top: 86, width: 120 }} />
            <div style={{ position: 'absolute', top: 104, left: 12, right: 12, display: 'flex', gap: 6 }}>
              <div style={{ flex: 1, height: 22, borderRadius: 3, background: '#fff', boxShadow: `0 0 0 2px ${plat.accent}` }} />
              <div style={{ flex: 1.2, height: 22, borderRadius: 3, background: 'rgba(255,255,255,.14)' }} />
            </div>
            <span className="tv-pill" style={{ left: 12, bottom: 10 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0A0322" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
              Back
            </span>
          </div>
          {/* 3 · Weekend hub → Pair, top right */}
          <div className="tv-scene tv-hubmock" data-on={scene === 'pair'}>
            <div className="glow" />
            <div className="wm" />
            <span className="tv-pill" style={{ top: 8, right: 10, fontSize: 8, padding: '3px 8px' }}>Pair</span>
            <div style={{ position: 'absolute', top: 30, left: 12, width: 72, height: 16, borderRadius: 3, background: 'rgba(255,255,255,.9)' }} />
            <div style={{ position: 'absolute', top: 52, left: 12, width: 118, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.3)' }} />
            <div style={{ position: 'absolute', top: 84, left: 12, width: 36, height: 6, borderRadius: 3, background: 'rgba(255,255,255,.7)' }} />
            <div className="grid">
              {tiles.slice(0, 5).map((t) => (
                <i key={t} style={{ backgroundImage: `url(${asset(`img/${t}.webp`)})` }} />
              ))}
            </div>
          </div>
          {/* 4 · Weekend welcome → QR */}
          <div className="tv-scene tv-qr" data-on={scene === 'qr'}>
            <div className="mark" />
            <div className="code">{qr}</div>
            <span>Scan to play</span>
          </div>
        </div>
      </div>
      <div className="tv-neck" />
      <div className="tv-base" />
    </div>
  );
}
