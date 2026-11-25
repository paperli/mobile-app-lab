// Game landing page. The email form has to sit inside the first viewport on
// small phones (375×548 in an in-app browser), so the stack above it is kept
// tight: header 56 + 16:9 video + a one-line title block.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { OFFERS, PLAN_BLOCKS, PLAN_INCLUDES, PLATFORMS, ROWS, tileFor, type OfferId } from '../config';
import { finishSubscribed, navigate } from '../router';
import { EMAIL_RE, findAccount, isMobile, setSession, useGame, useLook, useSession } from '../state';
import { WkHeader } from './WkHeader';
import { SectionNav, type NavSection } from './SectionNav';
import { Backdrop } from './Backdrop';
import { MobileAppBanner, useAppDownload } from './MobileAppBanner';

const SECTIONS: NavSection[] = [
  { id: 'trailers', label: 'Trailers' },
  { id: 'where', label: 'Where to Play' },
  { id: 'more', label: 'More Games' },
  { id: 'plans', label: 'Plans' },
];

/** True while the user is scrolling down past the hero; false at the top or when scrolling up. */
function useTuckOnScroll() {
  const [tucked, setTucked] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 80) setTucked(false);
      else if (y > last + 4) setTucked(true);
      else if (y < last - 4) setTucked(false);
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return tucked;
}

export function LandingPage() {
  const session = useSession();
  const look = useLook();
  const GAME = useGame();
  const offer = OFFERS[session.offer];
  const [email, setEmail] = useState(session.email);
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const brandHidden = useTuckOnScroll();
  const appDownload = useAppDownload();
  const subscribed = session.subscribed && !!session.user;

  // The post-checkout welcome flag is consumed silently; the page shows no toast.
  useEffect(() => {
    if (session.welcome) setSession({ welcome: false });
  }, [session.welcome]);

  const join = (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError('Invalid email');
      return;
    }
    setError('');
    setSession({ email: value });
    // New behavior: route by whether the email already has an account.
    navigate(findAccount(value) ? 'signin' : 'signup');
  };

  /** A plan block picks the offer, then hands off to the email form. */
  const choosePlan = (offerId: OfferId) => {
    setSession({ offer: offerId });
    const value = email.trim();
    if (EMAIL_RE.test(value)) {
      setSession({ email: value });
      navigate(findAccount(value) ? 'signin' : 'signup');
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.setTimeout(() => emailRef.current?.focus({ preventScroll: true }), 450);
  };

  const startPlaying = () => {
    if (isMobile()) navigate('play');
    else finishSubscribed({ toHub: true });
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !muted;
    if (v.paused) void v.play();
    setMuted(!muted);
  };

  return (
    <div className="wk" data-look={look}>
      <Backdrop video={GAME.video} poster={GAME.poster} syncWith={videoRef} anchor={mediaRef} />
      {/* One sticky bar, so the brand row and the section links share a single
          background. Scrolling down tucks the brand row away; scrolling up
          brings it back. The links stay pinned. */}
      <div className={`lp-topbar${brandHidden ? ' is-tucked' : ''}`}>
        <WkHeader />
        <SectionNav sections={SECTIONS} />
      </div>
      <main className="lp" id="trailers">
        <div className="lp-media" ref={mediaRef}>
          <video ref={videoRef} src={GAME.video} poster={GAME.poster} autoPlay muted loop playsInline aria-label={`${GAME.title} gameplay teaser`} />
          <button type="button" className="lp-mute" onClick={toggleMute} aria-label={muted ? 'Turn sound on' : 'Mute'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 9v6h4l5 4V5L8 9H4z" fill="#fff" />
              {muted ? <path d="M17 9l5 6M22 9l-5 6" /> : <path d="M17 8.5a5 5 0 010 7M19.5 6a8.5 8.5 0 010 12" />}
            </svg>
          </button>
        </div>

        <section className="lp-panel" aria-label={`Join ${GAME.title}`}>
          {/* The logo is the headline; the game facts live below the form. */}
          <h1 className={`lp-title is-${GAME.logoShape}`}>
            <img src={GAME.logo} alt={GAME.title} />
          </h1>
          <ul className="lp-meta" aria-label="Game details">
            <li>
              <svg viewBox="0 0 24 24" aria-hidden><circle cx="9" cy="8" r="3.2" /><path d="M3 19c.6-3.3 3-5 6-5s5.4 1.7 6 5" /><circle cx="17" cy="9" r="2.6" /><path d="M16.5 14.2c2.4.2 4 1.7 4.5 4.3" /></svg>
              {GAME.players}
            </li>
            <li>
              <svg viewBox="0 0 24 24" aria-hidden>{/* Lucide gamepad-2 (ISC) */}<path d="M6 11h4M8 9v4M15 12h.01M18 10h.01" /><path d="M17.32 5H6.68a4 4 0 00-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 003 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 019.828 16h4.344a2 2 0 011.414.586L17 18c.5.5 1 1 2 1a3 3 0 003-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0017.32 5z" /></svg>
              {GAME.category}
            </li>
            <li>
              {GAME.control.startsWith('Voice') ? (
                <svg viewBox="0 0 24 24" aria-hidden><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden><path d="M8 13V5.5a1.5 1.5 0 013 0V11m0-1.5V4a1.5 1.5 0 013 0v6.5m0-4a1.5 1.5 0 013 0V13m0-3.5a1.5 1.5 0 013 0V15a6 6 0 01-6 6h-1.5a6 6 0 01-4.9-2.6L5 14.5a1.5 1.5 0 012.5-1.7L8 13.5" /></svg>
              )}
              {GAME.control.replace(' Controlled', '')}
            </li>
          </ul>

          {subscribed ? (
            <div className="lp-form">
              <button type="button" className="wk-btn" onClick={startPlaying}>
                Start Playing
              </button>
            </div>
          ) : (
            <form className="lp-form" onSubmit={join} noValidate>
              <label htmlFor="lp-email" className="sr">Email</label>
              <input
                ref={emailRef}
                id="lp-email"
                className={`wk-input${error ? ' is-invalid' : ''}`}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                aria-invalid={!!error}
                aria-describedby={error ? 'lp-email-err' : undefined}
              />
              {error && <p id="lp-email-err" className="lp-error">{error}</p>}
              <button type="submit" className="wk-btn">Join Now</button>
              <p className="lp-fine">{offer.finePrint}</p>
            </form>
          )}
          {GAME.mobileApp && session.appBanner === 'cta' && <MobileAppBanner game={GAME} placement="cta" />}
        </section>
      </main>

      <div className="lp-more">
        <section className="lp-sec" id="about">
          <h2>About the game</h2>
          <p className="lp-about">{GAME.longDescription}</p>
          <dl className="lp-facts">
            <div><dt>Players</dt><dd>{GAME.players.replace(' Players', '')}</dd></div>
            <div><dt>Category</dt><dd>{GAME.category}</dd></div>
            <div><dt>Control</dt><dd>{GAME.control.replace(' Controlled', '')}</dd></div>
          </dl>
        </section>

        {GAME.mobileApp && session.appBanner === 'about' && <MobileAppBanner game={GAME} placement="about" />}

        {/* Where to play + How it works: stacked on phones, side by side on wide screens. */}
        <div className="lp-pair">
          <section className="lp-sec" id="where">
            <h2>Where to play</h2>
            <div className={`lp-platforms${GAME.mobileApp ? ' has-mobile' : ''}`}>
              {PLATFORMS.map((p) => (
                <div key={p.id} className="lp-plat" title={p.name}>
                  <img src={p.logo} alt={p.name} className={p.id === 'lg' ? 'keep' : undefined} />
                </div>
              ))}
              <div className={`lp-plat${GAME.mobileApp ? '' : ' wide'}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M2 20h20" /></svg>
                Mac &amp; PC
              </div>
              {/* Games with a free mobile version (in the Weekend app) also list phones. */}
              {GAME.mobileApp && (
                <a {...appDownload.linkProps} className="lp-plat is-mobile" title="Get the free mobile version in the Weekend app" aria-label="Mobile: get the free Weekend app">
                  <svg width="18" height="20" viewBox="0 0 20 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="12" height="20" rx="2.5" /><path d="M9 18.5h2" /></svg>
                  Mobile
                  <svg className="lp-plat-go" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17L17 7M9 7h8v8" /></svg>
                  <span className="lp-plat-tag">Free</span>
                </a>
              )}
              {appDownload.toast}
            </div>
          </section>

          <section className="lp-sec" id="how">
            <h2>How it works</h2>
            <ol className="lp-steps">
              <li><div><b>Join with your email</b><span>One Weekend Game Pass covers every game.</span></div></li>
              <li><div><b>Open Weekend on your TV or computer</b><span>Fire TV, Roku, Samsung, LG, or play.weekend.com in your browser.</span></div></li>
              <li><div><b>Play with your voice</b><span>Buzz in out loud. Your phone is the controller.</span></div></li>
            </ol>
          </section>
        </div>

        <section className="lp-sec" id="more">
          <h2>More games</h2>
          {ROWS.map((row) => ({ ...row, games: row.games.filter((g) => g.id !== GAME.id) })).map((row) => (
            <div key={row.key} className="lp-row">
              <h3 className="lp-sub">{row.title}</h3>
              <ul className="lp-rail" aria-label={row.title}>
                {row.games.map((g) => (
                  <li key={g.id} className="lp-tile">
                    <img src={tileFor(g.id)} alt="" loading="lazy" />
                    <b>{g.title}</b>
                    <span>{g.meta}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="lp-sec" id="plans">
          <h2>Plans</h2>
          <p className="lp-about">One Weekend Game Pass plays {GAME.title} and every other game on Weekend.</p>
          <div className="lp-plans">
            {PLAN_BLOCKS.map((p) => (
              <div key={p.id} className={`lp-plan${p.badge ? ' is-best' : ''}`}>
                <div className="lp-plan-h">
                  <b>{p.name}</b>
                  {p.badge && <span className="lp-badge">{p.badge}</span>}
                </div>
                <div className="lp-plan-p">
                  {p.price}
                  <small>{p.cadence}</small>
                </div>
                <p className="lp-plan-d">{p.detail}</p>
                {!subscribed && (
                  <button type="button" className={p.badge ? 'wk-btn' : 'wk-btn-ghost'} onClick={() => choosePlan(p.offer)}>
                    {p.cta}
                  </button>
                )}
              </div>
            ))}
          </div>
          <ul className="lp-includes">
            {PLAN_INCLUDES.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          {subscribed && <p className="lp-fine" style={{ textAlign: 'left' }}>Your Game Pass is active.</p>}
        </section>
      </div>
    </div>
  );
}

