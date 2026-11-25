// A sponsored post in a generic short-video feed. Landscape gameplay plays
// letterboxed over a blurred copy of itself, the way vertical feeds show 16:9.
import { useRef, useState } from 'react';
import { asset } from '../config';
import { navigate } from '../router';
import { setSession, useGame } from '../state';

const Heart = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="#fff"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.4 3 4.5 6.7 4.5c2 0 3.5 1.1 4.3 2.4.8-1.3 2.3-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.2C19.5 16.4 12 21 12 21z" /></svg>
);
const Bubble = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff"><path d="M12 3C6.5 3 2 6.8 2 11.5c0 2.6 1.4 4.9 3.6 6.5L5 21.5l4.1-2.1c.9.2 1.9.3 2.9.3 5.5 0 10-3.8 10-8.5S17.5 3 12 3z" /></svg>
);
const Bookmark = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><path d="M6 2.5h12a1 1 0 011 1v18l-7-4.5-7 4.5v-18a1 1 0 011-1z" /></svg>
);
const Share = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff"><path d="M13.5 4.5v4C6 9 3 13.5 2.5 20c2.3-3.4 5.6-5 11-5v4l8-7.2-8-7.3z" /></svg>
);
const Speaker = ({ muted }: { muted: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 9v6h4l5 4V5L8 9H4z" fill="#fff" />
    {muted ? <path d="M17 9l5 6M22 9l-5 6" /> : <path d="M17 8.5a5 5 0 010 7M19.5 6a8.5 8.5 0 010 12" />}
  </svg>
);

export function AdPage() {
  const GAME = useGame();
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const blurRef = useRef<HTMLVideoElement>(null);

  const toggleSound = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !muted;
    if (v.paused) void v.play();
    setMuted(!muted);
  };

  const open = () => {
    setSession({ src: 'tiktok' });
    navigate(GAME.id);
  };

  return (
    <div className="ad-page">
      <div className="ad-phone" onClick={toggleSound}>
        <video ref={blurRef} className="ad-blur" src={GAME.video} poster={GAME.poster} autoPlay muted loop playsInline aria-hidden />
        <video ref={videoRef} className="ad-video" src={GAME.video} poster={GAME.poster} autoPlay muted loop playsInline aria-label={`${GAME.title} gameplay teaser`} />
        <div className="ad-shade" />

        <span className="ad-proto">Prototype · mock ad</span>
        <div className="ad-top" aria-hidden>
          <span>Following</span>
          <span className="is-on">For You</span>
        </div>
        <button type="button" className="ad-sound" onClick={(e) => { e.stopPropagation(); toggleSound(); }}>
          <Speaker muted={muted} />
          {muted ? 'Tap for sound' : 'Sound on'}
        </button>

        <div className="ad-rail" aria-hidden>
          <div className="ad-avatar" style={{ backgroundImage: `url(${asset('img/weekend-logo.svg')})`, backgroundSize: '36px' }} />
          <div className="ad-act"><Heart />48.2K</div>
          <div className="ad-act"><Bubble />1,204</div>
          <div className="ad-act"><Bookmark />6,918</div>
          <div className="ad-act"><Share />3,377</div>
        </div>

        <div className="ad-copy">
          <div>
            <div className="ad-handle">weekendgames</div>
            <div className="ad-sponsored">Sponsored</div>
          </div>
          <div className="ad-caption">
            {GAME.ad.caption} <b>{GAME.ad.tags.join(' ')}</b>
          </div>
        </div>

        <button
          type="button"
          className="ad-cta"
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
        >
          Learn more
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
}
