import {
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
  useRef,
  useLayoutEffect,
} from 'react';
import type { NavigationDirection, NavigationAction } from '@mobile-app-lab/shared';
import { soundManager } from '../../utils/sounds';

/**
 * Party Mode playlist selection.
 *
 * Two focus regions:
 *   - "grid"     : featured + recently-played; OK toggles a playlist's checkbox
 *                  (up to MAX_SELECTED, FIFO once full).
 *   - "continue" : the top-right Continue button. Disabled until ≥1 playlist is
 *                  selected; reachable by pressing up from the featured row once
 *                  enabled. OK confirms the selection.
 *
 * Back steps up: from the grid with a selection it focuses Continue, otherwise
 * it exits to the Song Quiz menu; from Continue it exits to the menu. App.tsx
 * forwards directional / action input here via the imperative handle, the same
 * way it drives SystemMenuOverlay.
 */

// ---------------------------------------------------------------------------
// Data — placeholder catalog, mirrors PlaylistSelect until real assets land.
// ---------------------------------------------------------------------------

interface Playlist {
  id: string;
  title: string;
  description?: string;
  image: string;
}

const FEATURED: Playlist[] = [
  { id: 'f1', title: "Today's Top Hits", description: 'Chart-toppers you should definitely recognize!', image: '/games/song-quiz/featured-0.png' },
  { id: 'f2', title: '2020s', description: 'Modern-day bangers. Are you keeping up?', image: '/games/song-quiz/featured-1.png' },
  { id: 'f3', title: 'Songs of the Summer', description: 'Heatwave hits for beach days & barbecues.', image: '/games/song-quiz/featured-2.png' },
];

const RECENT: Playlist[] = [
  { id: 'r1', title: "Today's Top Hits", image: '/games/song-quiz/recent-0.png' },
  { id: 'r2', title: 'Hip Hop Classics', image: '/games/song-quiz/recent-1.png' },
  { id: 'r3', title: 'Animated Classics', image: '/games/song-quiz/recent-2.png' },
  { id: 'r4', title: '2020s', image: '/games/song-quiz/recent-3.png' },
  { id: 'r5', title: '2010s', image: '/games/song-quiz/recent-4.png' },
];

const ALL = [FEATURED, RECENT]; // [row][col]
const MAX_SELECTED = 3;

// ---------------------------------------------------------------------------
// Layout — px at 1920x1080 reference, converted to vw/vh so it scales.
// ---------------------------------------------------------------------------

const pxToVw = (px: number) => (px / 1920) * 100;
const pxToVh = (px: number) => (px / 1080) * 100;

const GRID = {
  featured: { startX: 90, y: 297, w: 532, h: 237, gap: 64, titleY: 243 },
  recent: { startX: 90, y: 721, w: 234, h: 234, gap: 64, titleY: 667 },
};

// Continue button — top-right, anchored to the grid's right edge. Content-sized,
// so its focus rect is measured from the rendered element at runtime.
const CONTINUE = { top: 90, right: 90 }; // px @ 1920x1080 reference

const FRAME_MARGIN = 0.5; // vw

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function gridRect(row: number, col: number): Rect {
  const c = row === 0 ? GRID.featured : GRID.recent;
  return { x: c.startX + col * (c.w + c.gap), y: c.y, w: c.w, h: c.h };
}
function gridCenterX(row: number, col: number): number {
  const c = row === 0 ? GRID.featured : GRID.recent;
  return c.startX + col * (c.w + c.gap) + c.w / 2;
}
function findClosestCol(fromRow: number, fromCol: number, toRow: number): number {
  const fromX = gridCenterX(fromRow, fromCol);
  let best = 0;
  let min = Infinity;
  for (let i = 0; i < ALL[toRow].length; i++) {
    const d = Math.abs(gridCenterX(toRow, i) - fromX);
    if (d < min) { min = d; best = i; }
  }
  return best;
}

// ---------------------------------------------------------------------------

export interface PartyPlaylistHandle {
  navigate: (direction: NavigationDirection) => void;
  action: (action: NavigationAction) => void;
}

interface PartyPlaylistSelectProps {
  /** Back pressed on the grid → return to the Song Quiz menu. */
  onExit: () => void;
  /** Continue pressed with ≥1 playlist chosen. */
  onSubmit: (playlistIds: string[]) => void;
}

type Region = 'grid' | 'continue';

export const PartyPlaylistSelect = forwardRef<PartyPlaylistHandle, PartyPlaylistSelectProps>(
  function PartyPlaylistSelect({ onExit, onSubmit }, ref) {
    const [region, setRegion] = useState<Region>('grid');
    const [gridRow, setGridRow] = useState(0);
    const [gridCol, setGridCol] = useState(0);
    // Selected playlist ids, in selection order (cap MAX_SELECTED).
    const [selected, setSelected] = useState<string[]>([]);
    const [bounce, setBounce] = useState<NavigationDirection | null>(null);
    const [pressing, setPressing] = useState(false);

    const continueEnabled = selected.length > 0;

    // The Continue button is content-sized, so measure its rendered box (in the
    // 1920x1080 reference space) to position the focus frame around it.
    const continueElRef = useRef<HTMLDivElement>(null);
    const [continueBox, setContinueBox] = useState<Rect | null>(null);
    useLayoutEffect(() => {
      const measure = () => {
        const el = continueElRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const W = window.innerWidth || 1920;
        const H = window.innerHeight || 1080;
        setContinueBox({
          x: (r.left / W) * 1920,
          y: (r.top / H) * 1080,
          w: (r.width / W) * 1920,
          h: (r.height / H) * 1080,
        });
      };
      measure();
      window.addEventListener('resize', measure);
      // Re-measure once webfonts settle (text width shifts on font swap).
      document.fonts?.ready.then(measure).catch(() => {});
      return () => window.removeEventListener('resize', measure);
    }, []);

    const doBounce = useCallback((direction: NavigationDirection) => {
      setBounce(direction);
      setTimeout(() => setBounce(null), 200);
      soundManager.playBounceSound();
    }, []);

    const move = useCallback(() => soundManager.playNavigationSound(), []);

    // --- Navigation --------------------------------------------------------
    const navigate = useCallback(
      (direction: NavigationDirection) => {
        if (region === 'continue') {
          // Only down drops back to the grid; everything else bounces.
          if (direction === 'down') { setRegion('grid'); move(); }
          else doBounce(direction);
          return;
        }

        // region === 'grid'
        switch (direction) {
          case 'left':
            if (gridCol === 0) doBounce(direction);
            else { setGridCol(gridCol - 1); move(); }
            break;
          case 'right':
            if (gridCol >= ALL[gridRow].length - 1) doBounce(direction);
            else { setGridCol(gridCol + 1); move(); }
            break;
          case 'up':
            if (gridRow === 0) {
              // From the top row, up reaches Continue once it's enabled.
              if (continueEnabled) { setRegion('continue'); move(); }
              else doBounce(direction);
            } else {
              const c = findClosestCol(gridRow, gridCol, 0); setGridRow(0); setGridCol(c); move();
            }
            break;
          case 'down':
            if (gridRow === ALL.length - 1) doBounce(direction);
            else { const c = findClosestCol(gridRow, gridCol, 1); setGridRow(1); setGridCol(c); move(); }
            break;
        }
      },
      [region, continueEnabled, gridRow, gridCol, doBounce, move]
    );

    const flashPress = useCallback(() => {
      setPressing(true);
      setTimeout(() => setPressing(false), 150);
    }, []);

    // --- Actions -----------------------------------------------------------
    const action = useCallback(
      (act: NavigationAction) => {
        if (region === 'continue') {
          if (act === 'back') {
            // Back from Continue leaves to the Song Quiz menu.
            onExit();
          } else if (act === 'ok') {
            flashPress();
            soundManager.playSelectionSound();
            onSubmit(selected);
          }
          return;
        }

        // region === 'grid'
        if (act === 'back') {
          // With a selection, back steps up to Continue; otherwise it exits.
          if (continueEnabled) {
            setRegion('continue');
            soundManager.playSelectionSound();
          } else {
            onExit();
          }
          return;
        }
        if (act === 'ok') {
          const picked = ALL[gridRow][gridCol];
          setSelected((prev) => {
            if (prev.includes(picked.id)) {
              // toggle off
              soundManager.playSelectionSound();
              return prev.filter((id) => id !== picked.id);
            }
            soundManager.playSelectionSound();
            if (prev.length >= MAX_SELECTED) {
              // at the cap — evict the oldest selection (FIFO) and add this one
              return [...prev.slice(1), picked.id];
            }
            return [...prev, picked.id];
          });
          flashPress();
        }
      },
      [region, continueEnabled, gridRow, gridCol, selected, onExit, onSubmit, flashPress]
    );

    useImperativeHandle(ref, () => ({ navigate, action }), [navigate, action]);

    // --- Render ------------------------------------------------------------
    // Fallback rect until the button has been measured (first paint).
    const continueFallback: Rect = { x: 1920 - CONTINUE.right - 196, y: CONTINUE.top, w: 196, h: 64 };
    const focusRect = region === 'continue' ? (continueBox ?? continueFallback) : gridRect(gridRow, gridCol);
    const selectedSet = new Set(selected);

    return (
      <div
        className="relative w-full h-full overflow-hidden"
        style={{ background: 'linear-gradient(108deg, #1C0C36 0%, #230F43 63.34%, #37186F 100%)' }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/games/song-quiz/playlist-bg.jpg)', opacity: 0.5 }}
        />

        {/* Header — sits below the Song Quiz logo zone. */}
        <div
          className="absolute left-0 right-0 flex items-center justify-center text-hint"
          style={{ top: `${pxToVh(172)}vh`, color: 'rgba(255,255,255,0.9)' }}
        >
          <span>
            Select <span style={{ color: '#FFE88B', fontWeight: 600 }}>1–3 Playlists</span>
          </span>
        </div>

        {/* Continue button (top-right). Content-sized; disabled until a
            playlist is chosen. */}
        <div
          ref={continueElRef}
          className="absolute inline-flex items-center justify-center text-callout"
          style={{
            top: `${pxToVh(CONTINUE.top)}vh`,
            right: `${pxToVw(CONTINUE.right)}vw`,
            padding: '16px 24px',
            whiteSpace: 'nowrap',
            borderRadius: '9999px',
            fontWeight: 500,
            background: continueEnabled
              ? 'linear-gradient(180deg, #FFE88B 0%, #F6D300 94.88%)'
              : 'rgba(255, 255, 255, 0.07)',
            color: continueEnabled ? '#231B00' : 'rgba(255, 255, 255, 0.3)',
            opacity: continueEnabled ? 1 : 0.7,
            transition: 'background 200ms ease, color 200ms ease, opacity 200ms ease',
          }}
        >
          Continue
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginLeft: '12px' }}
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>

        {/* Featured row */}
        <RowTitle x={GRID.featured.startX} y={GRID.featured.titleY} label="Featured" />
        {FEATURED.map((p, col) => (
          <GridCard key={p.id} playlist={p} rect={gridRect(0, col)} selected={selectedSet.has(p.id)} showDescription />
        ))}

        {/* Recently played row */}
        <RowTitle x={GRID.recent.startX} y={GRID.recent.titleY} label="Recently Played" />
        {RECENT.map((p, col) => (
          <GridCard key={p.id} playlist={p} rect={gridRect(1, col)} selected={selectedSet.has(p.id)} />
        ))}

        {/* Focus frame */}
        <FocusFrame rect={focusRect} bounce={bounce} pressing={pressing} radius={region === 'continue' ? 9999 : 16} />
      </div>
    );
  }
);

// ---------------------------------------------------------------------------
// Presentational helpers
// ---------------------------------------------------------------------------

function RowTitle({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <div
      className="absolute"
      style={{ left: `${pxToVw(x)}vw`, top: `${pxToVh(y)}vh`, fontSize: '30px', color: 'rgba(255,255,255,0.75)' }}
    >
      {label}
    </div>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <div
      className="absolute flex items-center justify-center"
      style={{
        left: '14px',
        top: '14px',
        width: '44px',
        height: '44px',
        borderRadius: '10px',
        background: checked ? '#FFE88B' : 'rgba(13, 8, 33, 0.78)',
        border: checked ? 'none' : '2px solid rgba(255,255,255,0.45)',
        transition: 'background 150ms ease',
      }}
    >
      {checked && (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M5 12.5l4.5 4.5L19 7" stroke="#231B00" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

function GridCard({
  playlist,
  rect,
  selected,
  showDescription,
}: {
  playlist: Playlist;
  rect: Rect;
  selected: boolean;
  showDescription?: boolean;
}) {
  return (
    <div
      className="absolute"
      style={{ left: `${pxToVw(rect.x)}vw`, top: `${pxToVh(rect.y)}vh`, width: `${pxToVw(rect.w)}vw` }}
    >
      <div className="relative" style={{ width: `${pxToVw(rect.w)}vw`, height: `${pxToVh(rect.h)}vh` }}>
        <img
          src={playlist.image}
          alt={playlist.title}
          className="w-full h-full"
          style={{ borderRadius: '12px', objectFit: 'cover', opacity: selected ? 0.85 : 1 }}
          draggable={false}
        />
        <Checkbox checked={selected} />
      </div>
      <div style={{ fontSize: '24px', color: '#fff', marginTop: '10px', fontWeight: 600 }}>{playlist.title}</div>
      {showDescription && playlist.description && (
        <div style={{ fontSize: '22px', color: 'rgba(255,255,255,0.75)', marginTop: '4px' }}>{playlist.description}</div>
      )}
    </div>
  );
}

function FocusFrame({
  rect,
  bounce,
  pressing,
  radius = 16,
}: {
  rect: Rect;
  bounce: NavigationDirection | null;
  pressing: boolean;
  radius?: number;
}) {
  const widthVw = pxToVw(rect.w) + FRAME_MARGIN * 2;
  const heightVh = pxToVh(rect.h) + FRAME_MARGIN * 2;
  const translateXVw = pxToVw(rect.x) - FRAME_MARGIN;
  const translateYVh = pxToVh(rect.y) - FRAME_MARGIN;

  const offset = (() => {
    switch (bounce) {
      case 'left': return { x: -1.5, y: 0 };
      case 'right': return { x: 1.5, y: 0 };
      case 'up': return { x: 0, y: -1.5 };
      case 'down': return { x: 0, y: 1.5 };
      default: return { x: 0, y: 0 };
    }
  })();

  const scale = pressing ? ' scale(0.96)' : '';
  const transform = `translate(${translateXVw + offset.x}vw, ${translateYVh + offset.y}vh)${scale}`;

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div
        className={bounce || pressing ? 'absolute transition-transform duration-150 ease-out' : 'absolute transition-all duration-300 ease-out'}
        style={{
          width: `${widthVw}vw`,
          height: `${heightVh}vh`,
          top: 0,
          left: 0,
          borderRadius: `${radius}px`,
          padding: '8px',
          background: 'linear-gradient(180deg, #FFE88B 0%, #F6D300 94.88%)',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude' as const,
          boxShadow: '0 0 40px rgba(255, 232, 139, 0.3)',
          transform,
        }}
      />
    </div>
  );
}
