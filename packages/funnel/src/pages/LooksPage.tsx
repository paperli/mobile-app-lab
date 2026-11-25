// Side-by-side comparison of the landing page looks. Each card is the real
// landing page in a phone-sized frame; tap one to use it.
import { useEffect, useRef, useState } from 'react';
import { LOOKS, type LookId } from '../config';
import { navigate } from '../router';
import { setSession, useSession } from '../state';

function Shot({ look, game }: { look: LookId; game: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.45);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / 375));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="look-shot" ref={box}>
      <iframe title={look} src={`./?look=${look}#${game}`} loading="lazy" tabIndex={-1} style={{ transform: `scale(${scale})` }} />
    </div>
  );
}

export function LooksPage() {
  const s = useSession();
  useEffect(() => {
    document.title = 'Landing looks';
  }, []);
  const pick = (id: LookId) => {
    setSession({ look: id });
    navigate(s.game);
  };
  return (
    <main className="looks">
      <h1>Landing page looks</h1>
      <p>Page hue and video frame. Tap one to use it across the landing and play pages.</p>
      {(['Colorful', 'Low-key'] as const).map((tone) => (
        <section key={tone}>
          <h2 className="looks-group">{tone}</h2>
          <div className="looks-grid">
            {LOOKS.filter((l) => l.tone === tone).map((l) => (
              <button key={l.id} type="button" className="look-card" aria-pressed={s.look === l.id} onClick={() => pick(l.id)}>
                <Shot look={l.id} game={s.game} />
                <span className="look-name">
                  {l.name}
                  {s.look === l.id && ' ✓'}
                  <small>{l.note}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
