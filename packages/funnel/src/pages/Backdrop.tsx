// Page backdrop for the "teaser" look: the game's teaser, blurred hard,
// dimmed with midnight and feathered into the page color at its edges.
// With `anchor`, it is the foreground video scaled up around that video's own
// center, so each blurred color sits right behind where it comes from. With
// `syncWith`, playback follows the foreground video.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';

/** How much larger than the foreground frame the backdrop plays. */
const SCALE = 3;

export function Backdrop({
  video,
  poster,
  syncWith,
  anchor,
}: {
  video?: string;
  poster: string;
  syncWith?: RefObject<HTMLVideoElement>;
  anchor?: RefObject<HTMLElement>;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<CSSProperties | undefined>();

  useEffect(() => {
    const fg = syncWith?.current;
    const bg = ref.current;
    if (!fg || !bg) return;
    const sync = () => {
      if (Math.abs(bg.currentTime - fg.currentTime) > 0.35) bg.currentTime = fg.currentTime;
      if (bg.paused && !fg.paused) void bg.play().catch(() => {});
    };
    fg.addEventListener('timeupdate', sync);
    return () => fg.removeEventListener('timeupdate', sync);
  }, [syncWith]);

  // Center on the foreground frame, measured against the backdrop's own parent.
  useLayoutEffect(() => {
    const el = anchor?.current;
    const parent = boxRef.current?.offsetParent as HTMLElement | null;
    if (!el || !parent) return;
    const measure = () => {
      const a = el.getBoundingClientRect();
      const p = parent.getBoundingClientRect();
      const w = a.width * SCALE;
      const h = a.height * SCALE;
      const cx = a.left - p.left + a.width / 2;
      const cy = a.top - p.top + a.height / 2;
      setBox({ left: cx - w / 2, top: cy - h / 2, width: w, height: h, right: 'auto' });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(parent);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [anchor]);

  return (
    <div ref={boxRef} className={`wk-backdrop${anchor ? ' is-anchored' : ''}`} style={box} aria-hidden>
      {video ? (
        <video ref={ref} src={video} poster={poster} autoPlay muted loop playsInline tabIndex={-1} />
      ) : (
        <img src={poster} alt="" />
      )}
    </div>
  );
}
