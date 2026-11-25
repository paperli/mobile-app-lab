// ─────────────────────────────────────────────────────────────────────────
//  Production desktop hub — layout + interaction replica
//
//  Mirrors prod's `?layout=desktop` hub (Projects/hub apps/client
//  components/DesktopHub): a transparent fixed top bar over a full-bleed merch
//  hero, then native-scrolling shelves whose tiles open a floating preview
//  card on hover / keyboard focus. Same content as the TV replica.
//
//  Left out vs prod: preview video + sound (no clips in the prototype; the card
//  keeps the tile art as its poster, which is what prod shows before the clip),
//  the upsell / checkout flow, and real auth (sign-in is simulated).
// ─────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FONT, HERO_ITEMS, INK, MIDNIGHT, WEEKEND_LOGO, gamePills, type HeroItem, type HubRow, type ProdGame } from './catalog';
import { ONBOARDING_ID } from '../hub9/onboarding';
import { StatusTag } from './ProdTvHub';

const AUTO_ADVANCE_MS = 8000;
const PREVIEW_INTENT_MS = 250;
const PREVIEW_EXIT_MS = 180;
const SURFACE = 'rgb(24 14 56)';

export interface ProdDesktopHubProps {
  rows: HubRow[];
  heroItems?: HeroItem[];
  onLaunch: (game: ProdGame) => void;
  /** Start signed in as this account (e.g. arriving from checkout). */
  signedInEmail?: string | null;
}

export function ProdDesktopHub({ rows, heroItems = HERO_ITEMS, onLaunch, signedInEmail = null }: ProdDesktopHubProps) {
  const [preview, setPreview] = useState<{ game: ProdGame; tile: HTMLElement; viaKeyboard: boolean; key: string } | null>(null);
  const [vhScale, setVhScale] = useState(() => window.innerHeight / 1080);
  useEffect(() => {
    const on = () => setVhScale(window.innerHeight / 1080);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // The page scrolls the document, as prod's `html.desktop-hub` does. The TV
  // demo pins html/body/#root to the viewport, so release them while mounted.
  useEffect(() => {
    const els = [document.documentElement, document.body, document.getElementById('root')].filter(Boolean) as HTMLElement[];
    const saved = els.map((el) => el.getAttribute('style'));
    const set = (el: HTMLElement, css: Partial<CSSStyleDeclaration>) => Object.assign(el.style, css);
    set(document.documentElement, { position: 'static', width: 'auto', height: 'auto', overflow: 'hidden auto', overscrollBehaviorX: 'none' });
    set(document.body, { position: 'static', width: 'auto', height: 'auto', overflow: 'visible', background: MIDNIGHT });
    const root = document.getElementById('root');
    if (root) set(root, { position: 'static', width: 'auto', height: 'auto', overflow: 'visible', inset: 'auto' });
    return () =>
      els.forEach((el, i) => {
        const s = saved[i];
        if (s == null) el.removeAttribute('style');
        else el.setAttribute('style', s);
      });
  }, []);

  return (
    <div className="dh-home">
      <style>{CSS}</style>
      <TopBar initialEmail={signedInEmail} />
      <Hero items={heroItems} onLaunch={onLaunch} />
      <div className="dh-shelf">
        {rows.map((row) => (
          <Shelf
            key={row.key}
            row={row}
            vhScale={vhScale}
            previewKey={preview?.key}
            onOpenPreview={(game, tile, viaKeyboard, key) => setPreview({ game, tile, viaKeyboard, key })}
            onClosePreview={(key) => setPreview((p) => (p && (!key || p.key === key) ? null : p))}
            onLaunch={onLaunch}
          />
        ))}
      </div>
      {preview && (
        <PreviewCard
          key={preview.key}
          game={preview.game}
          tile={preview.tile}
          viaKeyboard={preview.viaKeyboard}
          onClose={() => setPreview(null)}
          onLaunch={onLaunch}
        />
      )}
    </div>
  );
}

// ── Top bar ───────────────────────────────────────────────────────────────

function TopBar({ initialEmail }: { initialEmail: string | null }) {
  const [email, setEmail] = useState<string | null>(initialEmail);
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="dh-topbar">
      <img className="dh-logo" src={WEEKEND_LOGO} alt="Weekend" />
      <div className="dh-account">
        {email ? (
          <div className="dh-menu-anchor" onMouseEnter={() => setMenuOpen(true)} onMouseLeave={() => setMenuOpen(false)}>
            <button type="button" className={`dh-avatar ${menuOpen ? 'is-open' : ''}`} aria-label="Account" onClick={() => setMenuOpen((o) => !o)}>
              {email[0].toUpperCase()}
            </button>
            {menuOpen && (
              <div className="dh-menu" role="menu">
                <div className="dh-menu-email">{email}</div>
                <button type="button" role="menuitem" className="dh-menu-item">Edit Profile</button>
                <button type="button" role="menuitem" className="dh-menu-item">Manage Subscription</button>
                <button
                  type="button"
                  role="menuitem"
                  className="dh-menu-item is-danger"
                  onClick={() => {
                    setEmail(null);
                    setMenuOpen(false);
                  }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button type="button" className="dh-btn dh-btn-md" onClick={() => setAuthOpen(true)}>
            Sign in
          </button>
        )}
      </div>
      {authOpen && (
        <Stage onClose={() => setAuthOpen(false)}>
          <AuthForm
            onDone={(e) => {
              setEmail(e);
              setAuthOpen(false);
            }}
          />
        </Stage>
      )}
    </header>
  );
}

function AuthForm({ onDone }: { onDone: (email: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <>
      <h2 className="dh-stage-title">Sign in to Weekend</h2>
      <p className="dh-stage-sub">Use the email on your Weekend account.</p>
      <form
        className="dh-auth-form"
        onSubmit={(e) => {
          e.preventDefault();
          onDone(value.trim() || 'player@weekend.com');
        }}
      >
        <input className="dh-input" type="email" placeholder="Email address" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        <button type="submit" className="dh-btn dh-btn-lg dh-btn-block">Continue</button>
      </form>
      <p className="dh-stage-fine">Prototype — any email signs in.</p>
    </>
  );
}

/** DesktopStage: the full-screen modal prod uses for sign-in and the upsell. */
function Stage({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [onClose]);
  return createPortal(
    <div className="dh-stage" role="dialog" aria-modal="true" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dh-stage-col">
        <button type="button" className="dh-stage-close" aria-label="Close" onClick={onClose}>
          <Chevron d="M6 6l12 12M18 6L6 18" size={18} />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────

function Hero({ items, onLaunch }: { items: HeroItem[]; onLaunch: (g: ProdGame) => void }) {
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [restart, setRestart] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const lastInputKey = useRef(false);
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const item = items[index];
  const canAdvance = items.length > 1 && !reduced;

  // Keyboard focus inside the hero holds the carousel; a click does not.
  useEffect(() => {
    const kd = () => (lastInputKey.current = true);
    const pd = () => (lastInputKey.current = false);
    document.addEventListener('keydown', kd, true);
    document.addEventListener('pointerdown', pd, true);
    return () => {
      document.removeEventListener('keydown', kd, true);
      document.removeEventListener('pointerdown', pd, true);
    };
  }, []);

  // Remaining time banks across holds; any navigation resets it.
  const remaining = useRef(AUTO_ADVANCE_MS);
  useEffect(() => {
    remaining.current = AUTO_ADVANCE_MS;
  }, [index, restart]);
  // An open shelf preview only drops prod's hero video; the timer keeps going.
  const hold = held;
  useEffect(() => {
    if (!canAdvance || hold) return;
    const started = performance.now();
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % items.length), remaining.current);
    return () => {
      window.clearTimeout(t);
      remaining.current = Math.max(0, remaining.current - (performance.now() - started));
    };
  }, [canAdvance, hold, index, restart, items.length]);

  const page = (d: number) => {
    setIndex((i) => (i + d + items.length) % items.length);
    setRestart((r) => r + 1);
  };

  return (
    <section
      ref={ref}
      className="dh-hero"
      aria-roledescription="carousel"
      onFocus={() => lastInputKey.current && setHeld(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setHeld(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          page(e.key === 'ArrowLeft' ? -1 : 1);
        }
      }}
    >
      <div className="dh-hero-media" aria-hidden>
        {items.map((h, i) => (
          <img key={h.key} src={h.art} alt="" className={i === index ? 'is-active' : ''} />
        ))}
        <div className="dh-hero-scrim" />
      </div>
      <div
        className="dh-hero-content"
        data-orientation={item.kind === 'carousel' ? item.orientation : 'left'}
        style={{ '--off': item.contentOffsetY } as CSSProperties}
      >
        {item.kind === 'billboard' ? (
          <button type="button" className="dh-btn dh-btn-lg" onClick={() => onLaunch(item.game)}>
            {item.ctaLabel}
          </button>
        ) : (
          <ul className="dh-hero-cards">
            {item.games.map((g) => (
              <li key={g.id}>
                <button type="button" className="dh-hero-card" aria-label={`Play ${g.title}`} onClick={() => onLaunch(g)}>
                  <img src={g.tile} alt="" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {items.length > 1 && (
        <>
          <button type="button" className="dh-hero-arrow is-prev" aria-label="Previous" onClick={() => page(-1)}>
            <Chevron d="M15 5l-7 7 7 7" />
          </button>
          <button type="button" className="dh-hero-arrow is-next" aria-label="Next" onClick={() => page(1)}>
            <Chevron d="M9 5l7 7-7 7" />
          </button>
          <div className="dh-dots" role="tablist">
            {items.map((h, i) => (
              <span key={h.key} role="tab" aria-selected={i === index} className={`dh-dot ${i === index ? 'is-active' : ''}`}>
                {i === index && (
                  <span
                    key={`${index}-${restart}`}
                    className="dh-dot-fill"
                    style={{
                      animationDuration: `${AUTO_ADVANCE_MS}ms`,
                      animationPlayState: hold ? 'paused' : 'running',
                      ...(canAdvance ? {} : { animation: 'none', width: '100%' }),
                    }}
                  />
                )}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

// ── Shelf ─────────────────────────────────────────────────────────────────

function Shelf({
  row,
  vhScale,
  previewKey,
  onOpenPreview,
  onClosePreview,
  onLaunch,
}: {
  row: HubRow;
  vhScale: number;
  previewKey?: string;
  onOpenPreview: (game: ProdGame, tile: HTMLElement, viaKeyboard: boolean, key: string) => void;
  onClosePreview: (key?: string) => void;
  onLaunch: (g: ProdGame) => void;
}) {
  const scroller = useRef<HTMLUListElement>(null);
  const edges = useScrollEdges(scroller);
  const large = true; // every prod row is a "fixed" row → large tiles
  const hasPreview = !!previewKey?.startsWith(`${row.key}:`);
  const by = (d: number) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: d * 0.85 * el.clientWidth, behavior: 'smooth' });
  };
  return (
    <section className={`dh-row ${hasPreview ? 'has-preview' : ''}`} aria-label={row.title}>
      <h2 className="dh-row-title">{row.title}</h2>
      <div className="dh-row-viewport">
        <ul ref={scroller} className={`dh-scroller ${large ? 'is-large' : ''}`}>
          {row.games.map((g, i) => (
            <li key={`${g.id}-${i}`} className="dh-tile-slot">
              <DesktopTile
                game={g}
                tileKey={`${row.key}:${i}`}
                vhScale={vhScale}
                onOpenPreview={onOpenPreview}
                onClosePreview={onClosePreview}
                onLaunch={onLaunch}
              />
            </li>
          ))}
        </ul>
        <div className={`dh-fade is-left ${edges.left ? 'is-on' : ''}`} />
        <div className={`dh-fade is-right ${edges.right ? 'is-on' : ''}`} />
        {edges.left && (
          <button type="button" className="dh-handle is-left" aria-label={`Scroll ${row.title} left`} onClick={() => by(-1)}>
            <Chevron d="M15 5l-7 7 7 7" />
          </button>
        )}
        {edges.right && (
          <button type="button" className="dh-handle is-right" aria-label={`Scroll ${row.title} right`} onClick={() => by(1)}>
            <Chevron d="M9 5l7 7-7 7" />
          </button>
        )}
      </div>
    </section>
  );
}

function DesktopTile({
  game,
  tileKey,
  vhScale,
  onOpenPreview,
  onClosePreview,
  onLaunch,
}: {
  game: ProdGame;
  tileKey: string;
  vhScale: number;
  onOpenPreview: (game: ProdGame, tile: HTMLElement, viaKeyboard: boolean, key: string) => void;
  onClosePreview: (key?: string) => void;
  onLaunch: (g: ProdGame) => void;
}) {
  const timer = useRef<number>();
  const ref = useRef<HTMLButtonElement>(null);
  const isTouch = useRef(false);
  const schedule = (viaKeyboard: boolean) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => ref.current && onOpenPreview(game, ref.current, viaKeyboard, tileKey), PREVIEW_INTENT_MS);
  };
  const cancel = () => window.clearTimeout(timer.current);
  useEffect(() => cancel, []);
  return (
    <button
      ref={ref}
      type="button"
      className="dh-tile"
      data-tile-id={tileKey}
      aria-label={game.title}
      onPointerDown={(e) => (isTouch.current = e.pointerType === 'touch')}
      onPointerEnter={(e) => e.pointerType !== 'touch' && schedule(false)}
      onPointerLeave={cancel}
      onFocus={(e) => e.currentTarget.matches(':focus-visible') && schedule(true)}
      onBlur={cancel}
      onClick={() => {
        if (isTouch.current) {
          if (ref.current) onOpenPreview(game, ref.current, false, tileKey);
          return;
        }
        cancel();
        onClosePreview();
        onLaunch(game);
      }}
    >
      {game.id === ONBOARDING_ID ? (
        <div className="dh-onboarding-art">
          <img src={WEEKEND_LOGO} alt="" />
          <span>Welcome to Weekend</span>
        </div>
      ) : (
        <img src={game.tile} alt="" draggable={false} />
      )}
      {game.status && <StatusTag status={game.status} scale={vhScale} />}
    </button>
  );
}

// ── Preview card (DesktopGamePreview) ─────────────────────────────────────

function PreviewCard({
  game,
  tile,
  viaKeyboard,
  onClose,
  onLaunch,
}: {
  game: ProdGame;
  tile: HTMLElement;
  viaKeyboard: boolean;
  onClose: () => void;
  onLaunch: (g: ProdGame) => void;
}) {
  const card = useRef<HTMLDivElement>(null);
  const play = useRef<HTMLButtonElement>(null);
  const [box, setBox] = useState<{ left: number; top: number; width: number; origin: string; start: number } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [liked, setLiked] = useState(false);
  const [sound, setSound] = useState(() => {
    try {
      return sessionStorage.getItem('desktop-hub-preview-audio') === 'on';
    } catch {
      return false;
    }
  });
  const pills = gamePills(game);

  const close = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(onClose, PREVIEW_EXIT_MS);
  }, [leaving, onClose]);

  const place = useCallback(() => {
    const r = tile.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const gutter = Math.min(72, Math.max(20, vw * 0.04));
    const inset = Math.max(gutter, 16);
    const width = Math.min(Math.max(r.width * 1.5, 320), 520, vw - 2 * inset);
    const mediaH = (width * 9) / 16;
    const cardH = card.current?.offsetHeight ?? mediaH + 200;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const left = Math.min(Math.max(cx - width / 2, inset), vw - inset - width);
    const top = Math.min(Math.max(cy - mediaH / 2, 16), vh - 16 - cardH);
    setBox({ left, top, width, origin: `${cx - left}px ${cy - top}px`, start: Math.min(1, r.width / width) });
  }, [tile]);

  useLayoutEffect(() => {
    place();
    const raf = requestAnimationFrame(place); // second pass with the measured height
    return () => cancelAnimationFrame(raf);
  }, [place]);

  // Follow scrolls (rows too — capture phase) and close once the tile leaves.
  useEffect(() => {
    let settle: number | undefined;
    const onScroll = () => {
      requestAnimationFrame(place);
      window.clearTimeout(settle);
      settle = window.setTimeout(() => {
        const r = tile.getBoundingClientRect();
        const row = tile.closest('.dh-scroller')?.getBoundingClientRect();
        const out = r.bottom < 0 || r.top > window.innerHeight || (row && (r.right < row.left || r.left > row.right));
        if (out) close();
      }, 150);
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', place);
      window.clearTimeout(settle);
    };
  }, [place, tile, close]);

  // Close on pointer travel off the card and every tile, outside presses, Escape.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const t = e.target as Element | null;
      if (card.current?.contains(t) || t?.closest('[data-tile-id]') === tile) return;
      if (t?.closest('[data-tile-id]')) return; // another tile's intent timer takes over
      close();
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!card.current?.contains(t) && !tile.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const hadFocus = card.current?.contains(document.activeElement);
      close();
      if (hadFocus) tile.focus();
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [tile, close]);

  useEffect(() => {
    if (viaKeyboard && box) play.current?.focus({ preventScroll: true });
  }, [viaKeyboard, box]);

  return createPortal(
    <div
      ref={card}
      className={`dh-preview ${leaving ? 'is-leaving' : ''}`}
      role="dialog"
      aria-label={game.title}
      style={
        box
          ? ({ left: box.left, top: box.top, width: box.width, transformOrigin: box.origin, '--start': box.start } as CSSProperties)
          : { visibility: 'hidden', left: 0, top: 0, width: 320 }
      }
      onBlur={(e) => {
        const next = e.relatedTarget as Node | null;
        if (next && !card.current?.contains(next) && !tile.contains(next)) close();
      }}
      onClick={(e) => {
        if ((e.target as Element).closest('[data-no-play]')) return;
        onLaunch(game);
      }}
    >
      <div className="dh-preview-media">
        {game.id === ONBOARDING_ID ? (
          <div className="dh-onboarding-art">
            <img src={WEEKEND_LOGO} alt="" />
            <span>Welcome to Weekend</span>
          </div>
        ) : (
          <img src={game.tile} alt="" />
        )}
        <button
          type="button"
          data-no-play
          className={`dh-icon-btn dh-icon-sm dh-sound ${sound ? 'is-on' : ''}`}
          aria-label={sound ? 'Mute preview' : 'Unmute preview'}
          aria-pressed={sound}
          onClick={() => {
            setSound((s) => {
              try {
                sessionStorage.setItem('desktop-hub-preview-audio', s ? 'off' : 'on');
              } catch {
                /* storage unavailable */
              }
              return !s;
            });
          }}
        >
          <Chevron d={sound ? 'M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z' : 'M4 9v6h4l5 4V5L8 9H4zm12 0l5 6m0-6l-5 6'} size={16} />
        </button>
      </div>
      <div className="dh-preview-body">
        {!game.logo && <h3 className="dh-preview-title">{game.title}</h3>}
        <div className="dh-preview-actions">
          <button ref={play} type="button" className="dh-btn dh-btn-md" onClick={(e) => (e.stopPropagation(), onLaunch(game))}>
            <svg viewBox="0 0 24 24" width="1.15em" height="1.15em" aria-hidden>
              <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" />
            </svg>
            Play
          </button>
          <button
            type="button"
            data-no-play
            className={`dh-icon-btn dh-icon-md ${liked ? 'is-on' : ''}`}
            aria-label="Like"
            aria-pressed={liked}
            onClick={() => setLiked((l) => !l)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
              <path
                d="M7 11v9H4v-9h3zm2 9h8.2a2 2 0 0 0 2-1.6l1.2-6A2 2 0 0 0 18.4 10H14l.7-3.6A1.8 1.8 0 0 0 13 4.3L9 11v9z"
                fill={liked ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        {game.description && <p className="dh-preview-desc">{game.description}</p>}
        <div className="dh-pills">
          {pills.map((p) => (
            <span key={p.label} className="dh-pill">
              <img src={p.icon} alt="" />
              {p.label}
            </span>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Hooks / bits ─────────────────────────────────────────────────────────

function useScrollEdges(ref: React.RefObject<HTMLElement>) {
  const [edges, setEdges] = useState({ left: false, right: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const left = el.scrollLeft > 2;
      const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
      setEdges((e) => (e.left === left && e.right === right ? e : { left, right }));
    };
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      ro.disconnect();
    };
  }, [ref]);
  return edges;
}

function useMediaQuery(q: string) {
  const [match, setMatch] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setMatch(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [q]);
  return match;
}

function Chevron({ d, size }: { d: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size ?? '50%'} height={size ?? '50%'} aria-hidden fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

// ── Styles (values from prod DesktopHub/*.module.scss + @volley/arcade-web) ──

const CSS = `
.dh-home {
  --gutter: clamp(20px, 4vw, 72px);
  --bar-h: clamp(64px, 6vw, 80px);
  --tile-gap: clamp(10px, 1vw, 16px);
  --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);
  min-height: 100vh;
  background: ${MIDNIGHT};
  color: ${INK};
  font-family: ${FONT};
  -webkit-font-smoothing: antialiased;
}
.dh-home *, .dh-preview *, .dh-stage * { box-sizing: border-box; }
.dh-home button, .dh-preview button, .dh-stage button { font-family: inherit; }

/* Buttons (arcade-web primary) */
.dh-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  border: 0; border-radius: 9999px; cursor: pointer; white-space: nowrap;
  font-weight: 500; letter-spacing: 0.02em; color: ${MIDNIGHT};
  background: linear-gradient(180deg, rgb(255 240 158), rgb(255 218 10));
  box-shadow: 0 6px 22px rgb(255 228 1 / .35), 0 12px 30px rgb(0 0 0 / .6);
  transition: background 150ms ease-out, box-shadow 150ms ease-out, transform 150ms ease-out;
}
.dh-btn:hover { background: linear-gradient(180deg, rgb(255 248 207), rgb(255 229 84)); box-shadow: 0 8px 28px rgb(255 228 1 / .35), 0 12px 30px #0009; transform: translateY(-1px); }
.dh-btn:active { background: linear-gradient(180deg, rgb(255 218 10), rgb(217 185 8)); box-shadow: none; transform: scale(0.97); transition-duration: 100ms; }
.dh-btn:focus-visible, .dh-tile:focus-visible, .dh-hero-card:focus-visible, .dh-icon-btn:focus-visible, .dh-hero-arrow:focus-visible { outline: 2px solid #ffda0a; outline-offset: 3px; }
.dh-btn:focus:not(:focus-visible) { outline: none; }
.dh-btn-md { height: 40px; padding: 0 20px; font-size: 15px; }
.dh-btn-lg { height: 52px; padding: 0 32px; font-size: 18px; }
.dh-btn-block { width: 100%; }

.dh-icon-btn {
  display: inline-grid; place-items: center; padding: 0; cursor: pointer; flex: none;
  border-radius: 50%; border: 1.5px solid ${INK}; background: rgb(10 3 34 / .64); color: ${INK};
  transition: background 150ms ease-out, transform 150ms ease-out;
}
.dh-icon-btn:hover { background: rgb(10 3 34 / .84); transform: scale(1.06); }
.dh-icon-btn:active { transform: scale(0.94); }
.dh-icon-btn.is-on { background: ${INK}; color: ${MIDNIGHT}; }
.dh-icon-sm { width: 32px; height: 32px; }
.dh-icon-md { width: 40px; height: 40px; }

/* Top bar */
.dh-topbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 998; height: var(--bar-h);
  padding: 0 var(--gutter); display: flex; align-items: center; justify-content: space-between;
}
.dh-logo { width: clamp(120px, 11vw, 168px); height: auto; display: block; }
.dh-account { display: flex; gap: 12px; align-items: center; }
.dh-menu-anchor { position: relative; }
.dh-avatar {
  width: 40px; height: 40px; border-radius: 50%; border: 0; cursor: pointer;
  background: linear-gradient(135deg, rgb(255 229 84) 0%, rgb(251 121 40) 55%, rgb(211 115 179) 100%);
  color: ${MIDNIGHT}; font-size: 17px; font-weight: 700; box-shadow: 0 4px 12px rgb(0 0 0 / .35);
  transition: box-shadow 150ms, filter 150ms, transform 100ms;
}
.dh-avatar:hover, .dh-avatar.is-open { box-shadow: 0 0 0 2px ${INK}, 0 4px 12px rgb(0 0 0 / .35); filter: brightness(1.06); }
.dh-avatar:active { transform: scale(0.94); }
.dh-menu {
  position: absolute; right: 0; top: 100%; margin-top: 8px; min-width: 240px; padding: 6px;
  border-radius: 14px; background: ${SURFACE}; box-shadow: 0 24px 64px rgb(0 0 0 / .55);
  display: flex; flex-direction: column;
}
.dh-menu::before { content: ''; position: absolute; left: 0; right: 0; top: -10px; height: 10px; }
.dh-menu-email { padding: 10px 14px 8px; font-size: 13px; color: rgb(243 244 241 / .6); }
.dh-menu-item { text-align: left; padding: 10px 14px; border: 0; border-radius: 8px; background: transparent; color: ${INK}; font-size: 15px; cursor: pointer; }
.dh-menu-item:hover { background: rgb(243 244 241 / .10); }
.dh-menu-item:active { background: rgb(243 244 241 / .16); }
.dh-menu-item.is-danger { color: rgb(247 33 73); }
.dh-menu-item.is-danger:hover { background: rgb(247 33 73 / .16); }

/* Hero */
.dh-hero {
  position: relative; width: 100%; aspect-ratio: 1920 / 900; max-height: 78vh; min-height: 352px;
  overflow: hidden; background: ${MIDNIGHT}; container-type: size;
}
.dh-hero-media, .dh-hero-media img { position: absolute; inset: 0; width: 100%; height: 100%; }
.dh-hero-media img { object-fit: cover; opacity: 0; transition: opacity .45s ease; }
.dh-hero-media img.is-active { opacity: 1; }
.dh-hero-scrim { position: absolute; left: 0; right: 0; bottom: 0; height: 13.3%; background: linear-gradient(0deg, ${MIDNIGHT} 0%, rgb(10 3 34 / 0) 100%); }
.dh-hero-content {
  position: absolute; left: var(--gutter); right: var(--gutter); bottom: clamp(56px, 9%, 96px); z-index: 2;
  display: flex; transform: translateY(calc(var(--off, 0) * -100cqh / 900));
}
.dh-hero-content[data-orientation='right'] { justify-content: flex-end; }
.dh-hero-content[data-orientation='center'] { justify-content: center; }
.dh-hero-cards { list-style: none; margin: 0; padding: 0; display: flex; gap: clamp(12px, 1.2vw, 20px); }
.dh-hero-card {
  display: block; width: clamp(144px, 14vw, 240px); aspect-ratio: 16 / 9; padding: 0; border: 0; cursor: pointer;
  border-radius: 12px; overflow: hidden; background: ${SURFACE}; box-shadow: 0 12px 32px rgb(0 0 0 / .45);
  transition: transform .15s ease, box-shadow .15s ease;
}
.dh-hero-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
.dh-hero-card:hover { transform: translateY(-4px) scale(1.04); box-shadow: 0 16px 40px rgb(0 0 0 / .55); }
.dh-hero-arrow {
  position: absolute; top: calc(50% - 26px); z-index: 3; width: 52px; height: 52px; padding: 0;
  display: grid; place-items: center; border-radius: 50%; cursor: pointer; color: ${INK};
  background: rgb(10 3 34 / .64); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgb(243 244 241 / .16); opacity: 0;
  transition: opacity .2s, background 150ms, border-color 150ms;
}
.dh-hero-arrow:hover { background: rgb(10 3 34 / .84); border-color: rgb(243 244 241 / .4); }
.dh-hero-arrow.is-prev { left: clamp(12px, 1.5vw, 24px); }
.dh-hero-arrow.is-next { right: clamp(12px, 1.5vw, 24px); }
.dh-hero:hover .dh-hero-arrow, .dh-hero-arrow:focus-visible { opacity: 1; }
.dh-dots {
  position: absolute; bottom: calc(44 * 100vh / 1080); left: 50%; transform: translateX(-50%); z-index: 2;
  display: flex; align-items: center; gap: calc(12 * 100vh / 1080);
}
.dh-dot {
  position: relative; width: calc(12 * 100vh / 1080); height: calc(12 * 100vh / 1080); border-radius: 999px;
  background: rgb(255 255 255 / .4); overflow: hidden; flex: none; transition: width .3s ease, background .3s ease;
}
.dh-dot.is-active { width: calc(36 * 100vh / 1080); }
.dh-dot-fill {
  position: absolute; top: 0; bottom: 0; left: 0; border-radius: inherit; background: #ffda0a;
  width: calc(12 * 100vh / 1080); animation-name: dhDotFill; animation-timing-function: linear; animation-fill-mode: forwards;
}
@keyframes dhDotFill { from { width: calc(12 * 100vh / 1080); } to { width: 100%; } }

/* Shelf */
.dh-shelf { display: flex; flex-direction: column; gap: clamp(28px, 3vw, 44px); padding-bottom: 64px; position: relative; z-index: 1; }
.dh-row { display: flex; flex-direction: column; gap: 12px; }
.dh-row-title { margin: 0; padding: 0 var(--gutter); font-size: clamp(18px, 0.9rem + 0.5vw, 24px); font-weight: 700; line-height: 1.2; }
.dh-row-viewport { position: relative; container-type: inline-size; }
.dh-scroller {
  --n: 6; list-style: none; margin: 0; display: flex; gap: var(--tile-gap); padding: 4px var(--gutter);
  overflow-x: auto; overflow-y: hidden; overscroll-behavior-x: contain;
  scroll-snap-type: x proximity; scroll-padding-inline: var(--gutter); scrollbar-width: none;
}
.dh-scroller::-webkit-scrollbar { display: none; }
.dh-scroller.is-large { --n: 5; }
@container (max-width: 1439.98px) { .dh-scroller { --n: 5; } .dh-scroller.is-large { --n: 4; } }
@container (max-width: 1099.98px) { .dh-scroller { --n: 4; } .dh-scroller.is-large { --n: 3; } }
@container (max-width: 759.98px)  { .dh-scroller { --n: 3; } .dh-scroller.is-large { --n: 2; } }
.dh-tile-slot {
  flex: none; scroll-snap-align: start;
  width: calc((100cqw - 2 * var(--gutter) - (var(--n) - 1) * var(--tile-gap)) / (var(--n) + 0.2));
}
.dh-tile {
  position: relative; display: block; width: 100%; aspect-ratio: 16 / 9; padding: 0; border: 0; cursor: pointer;
  border-radius: 10px; overflow: hidden; background: ${SURFACE}; transition: filter .15s;
}
.dh-tile > img { width: 100%; height: 100%; object-fit: cover; display: block; }
.dh-tile:hover { filter: brightness(1.08); }
.dh-onboarding-art {
  position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-start;
  padding: 7% 7%; text-align: left; gap: 6%;
  background: radial-gradient(120% 140% at 85% 10%, #4a2fa0 0%, #1d0f4a 45%, #0a0322 100%);
  color: ${INK}; font-weight: 700; font-size: clamp(13px, 1.3cqw, 22px); line-height: 1.1;
}
.dh-onboarding-art img { height: 16%; width: auto; }
.dh-fade { position: absolute; top: 0; bottom: 0; width: var(--gutter); pointer-events: none; opacity: 0; transition: opacity .2s; z-index: 1; }
.dh-fade.is-on { opacity: 1; }
.dh-fade.is-left { left: 0; background: linear-gradient(90deg, ${MIDNIGHT}, rgb(10 3 34 / 0)); }
.dh-fade.is-right { right: 0; background: linear-gradient(270deg, ${MIDNIGHT}, rgb(10 3 34 / 0)); }
.dh-handle {
  position: absolute; top: 4px; bottom: 4px; width: var(--gutter); z-index: 2; padding: 0; border: 0; cursor: pointer;
  display: grid; place-items: center; color: ${INK}; background: transparent; transition: background .2s;
}
.dh-handle.is-left { left: 0; border-radius: 0 8px 8px 0; }
.dh-handle.is-right { right: 0; border-radius: 8px 0 0 8px; }
.dh-handle svg { width: clamp(20px, 2vw, 32px); height: clamp(20px, 2vw, 32px); opacity: 0; transition: opacity .2s; }
.dh-row:hover .dh-handle, .dh-row.has-preview .dh-handle { background: rgb(10 3 34 / .45); }
.dh-row:hover .dh-handle svg, .dh-row.has-preview .dh-handle svg, .dh-handle:focus-visible svg { opacity: 1; }
.dh-handle:hover { background: rgb(10 3 34 / .70) !important; }
.dh-handle:active { background: rgb(10 3 34 / .82) !important; }
.dh-handle:focus-visible { outline: none; background: rgb(10 3 34 / .70); box-shadow: inset 0 0 0 2px #ffda0a; }

@media (hover: none), (pointer: coarse) {
  .dh-hero-arrow { opacity: 1; }
  .dh-handle { background: rgb(10 3 34 / .45); }
  .dh-handle svg { opacity: 1; }
}

/* Preview card */
.dh-preview {
  position: fixed; z-index: 999; border-radius: 14px; overflow: hidden; cursor: pointer;
  background: ${SURFACE}; color: ${INK}; font-family: ${FONT};
  box-shadow: 0 24px 64px rgb(0 0 0 / .55), 0 4px 16px rgb(0 0 0 / .35);
  animation: dhPreviewGrow 340ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
.dh-preview.is-leaving { pointer-events: none; animation: dhPreviewShrink 180ms cubic-bezier(0.4, 0, 1, 1) both; }
@keyframes dhPreviewGrow { 0% { opacity: 0; transform: scale(var(--start, .7)); } 55% { opacity: 1; } 100% { opacity: 1; transform: scale(1); } }
@keyframes dhPreviewShrink { to { opacity: 0; transform: scale(calc((1 + var(--start, .7)) / 2)); } }
.dh-preview-media { position: relative; aspect-ratio: 16 / 9; background: ${MIDNIGHT}; }
.dh-preview-media > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.dh-sound { position: absolute; right: 12px; bottom: 12px; }
.dh-preview-body {
  display: flex; flex-direction: column; gap: 10px; padding: 16px 18px 20px;
  animation: dhPreviewDetails 280ms ease-out 120ms both;
}
@keyframes dhPreviewDetails { from { opacity: 0; transform: translateY(6px); } }
.dh-preview-title { margin: 0; font-size: 20px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dh-preview-actions { display: flex; gap: 8px; margin-bottom: 4px; align-items: center; }
.dh-preview-desc {
  margin: 0; font-size: 15px; line-height: 1.45; color: rgb(243 244 241 / .72);
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
}
.dh-pills { display: flex; flex-wrap: wrap; gap: 6px; }
.dh-pill {
  display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 12px 0 8px; border-radius: 9999px;
  background: rgb(243 244 241 / .10); color: rgb(243 244 241 / .88); font-size: 13px; font-weight: 500; white-space: nowrap;
}
.dh-pill img { width: 16px; height: 16px; object-fit: contain; }

/* Stage (modal) */
.dh-stage {
  position: fixed; inset: 0; z-index: 1000; overflow-y: auto; display: flex; justify-content: center; align-items: flex-start;
  padding: 72px 16px 48px; color: ${INK}; font-family: ${FONT};
  background: radial-gradient(circle 61vh at 50% 39vh, rgb(0 0 0 / .9) 0%, rgb(0 0 0 / .9) 52%, rgb(0 0 0 / .75) 100%);
  animation: dhStageIn 420ms ease both;
}
@keyframes dhStageIn { from { opacity: 0; } }
.dh-stage-col { position: relative; width: 100%; max-width: 544px; text-align: center; margin-top: 10vh; }
.dh-stage-col > :not(.dh-stage-close) { animation: dhStageRise 620ms cubic-bezier(0.22, 0.61, 0.36, 1) both; }
.dh-stage-col > :nth-child(2) { animation-delay: 120ms; }
.dh-stage-col > :nth-child(3) { animation-delay: 210ms; }
.dh-stage-col > :nth-child(4) { animation-delay: 300ms; }
.dh-stage-col > :nth-child(5) { animation-delay: 390ms; }
@keyframes dhStageRise { from { opacity: 0; transform: translateY(24px); } }
.dh-stage-close {
  position: absolute; top: 0; right: -56px; width: 40px; height: 40px; border-radius: 50%; border: 0; cursor: pointer;
  display: grid; place-items: center; color: ${INK}; background: rgb(243 244 241 / .1); transition: background 150ms, transform 100ms;
}
.dh-stage-close:hover { background: rgb(243 244 241 / .2); }
.dh-stage-close:active { transform: scale(0.92); }
@media (max-width: 44rem) { .dh-stage-close { top: -52px; right: 0; } }
.dh-stage-title { margin: 0 0 12px; font-size: clamp(32px, 1.6rem + 1.6vw, 56px); line-height: 1.05; font-weight: 700; }
.dh-stage-sub { margin: 0 0 32px; font-size: 16px; color: rgb(243 244 241 / .72); }
.dh-auth-form { display: flex; flex-direction: column; gap: 12px; max-width: 384px; margin: 0 auto; }
.dh-input {
  height: 52px; border-radius: 10px; border: 1px solid rgb(243 244 241 / .2); background: rgb(243 244 241 / .06);
  color: ${INK}; padding: 0 16px; font: 16px ${FONT};
}
.dh-input:focus { outline: 2px solid #ffda0a; outline-offset: 2px; }
.dh-stage-fine { margin-top: 20px; font-size: 13px; color: rgb(243 244 241 / .5); }

@media (prefers-reduced-motion: reduce) {
  .dh-home *, .dh-preview, .dh-preview *, .dh-stage, .dh-stage * { transition: none !important; animation: none !important; }
}
`;
