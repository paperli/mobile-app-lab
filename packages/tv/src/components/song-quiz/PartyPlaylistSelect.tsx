import {
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
  useRef,
} from 'react';
import type { NavigationDirection, NavigationAction } from '@mobile-app-lab/shared';
import { soundManager } from '../../utils/sounds';

/**
 * Party Mode playlist selection — a self-contained navigation system.
 *
 * Two focus regions handed off via OK / Back:
 *   - "bar"  : [slot0, slot1, slot2, submit]  (the selected-playlist bar on top)
 *   - "grid" : featured (row 0) + recently played (row 1)
 *
 * Flow: enter on the bar (slot 0, all empty, submit disabled) → OK on an empty
 * slot jumps into the grid → OK on a playlist fills the origin slot and bounces
 * focus back to the next empty slot (or submit when full) → submit enables once
 * any slot is filled. Back from the grid returns to the origin slot; back from
 * the bar exits to the Song Quiz menu.
 *
 * App.tsx forwards directional / action input here via the imperative handle,
 * the same way it drives SystemMenuOverlay.
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
const SLOT_COUNT = 3;

// ---------------------------------------------------------------------------
// Layout — px at 1920x1080 reference, converted to vw/vh so it scales.
// ---------------------------------------------------------------------------

const pxToVw = (px: number) => (px / 1920) * 100;
const pxToVh = (px: number) => (px / 1080) * 100;

const SLOT = { startX: 90, y: 96, w: 248, h: 140, gap: 28 };
const SUBMIT = { w: 268, h: 140, y: 96, x: 1920 - 90 - 268 }; // right-aligned
const GRID = {
  featured: { startX: 90, y: 360, w: 532, h: 237, gap: 64, titleY: 308 },
  recent: { startX: 90, y: 700, w: 234, h: 234, gap: 64, titleY: 648 },
};

const FRAME_MARGIN = 0.5; // vw

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function barSlotRect(i: number): Rect {
  return { x: SLOT.startX + i * (SLOT.w + SLOT.gap), y: SLOT.y, w: SLOT.w, h: SLOT.h };
}
function submitRect(): Rect {
  return { x: SUBMIT.x, y: SUBMIT.y, w: SUBMIT.w, h: SUBMIT.h };
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
  /** Back pressed while on the bar → return to the Song Quiz menu. */
  onExit: () => void;
  /** Submit pressed with at least one playlist chosen. */
  onSubmit: (playlistIds: string[]) => void;
}

type Region = 'bar' | 'grid';
const SUBMIT_INDEX = SLOT_COUNT; // bar index for the submit button

export const PartyPlaylistSelect = forwardRef<PartyPlaylistHandle, PartyPlaylistSelectProps>(
  function PartyPlaylistSelect({ onExit, onSubmit }, ref) {
    const [region, setRegion] = useState<Region>('bar');
    const [barIndex, setBarIndex] = useState(0); // 0..SLOT_COUNT (SUBMIT_INDEX = submit)
    const [gridRow, setGridRow] = useState(0);
    const [gridCol, setGridCol] = useState(0);
    const [slots, setSlots] = useState<(Playlist | null)[]>(() => Array(SLOT_COUNT).fill(null));
    const [bounce, setBounce] = useState<NavigationDirection | null>(null);
    const [pressing, setPressing] = useState(false);

    // The slot we are filling while in the grid.
    const originSlotRef = useRef(0);

    const filledCount = slots.filter(Boolean).length;
    const submitEnabled = filledCount > 0;

    const doBounce = useCallback((direction: NavigationDirection) => {
      setBounce(direction);
      setTimeout(() => setBounce(null), 200);
      soundManager.playBounceSound();
    }, []);

    const move = useCallback(() => soundManager.playNavigationSound(), []);

    // --- Navigation --------------------------------------------------------
    const navigate = useCallback(
      (direction: NavigationDirection) => {
        if (region === 'bar') {
          const maxIndex = submitEnabled ? SUBMIT_INDEX : SLOT_COUNT - 1;
          if (direction === 'left') {
            if (barIndex === 0) doBounce(direction);
            else { setBarIndex(barIndex - 1); move(); }
          } else if (direction === 'right') {
            if (barIndex >= maxIndex) doBounce(direction);
            else { setBarIndex(barIndex + 1); move(); }
          } else {
            // Nothing above the bar; the grid is reached via OK on a slot.
            doBounce(direction);
          }
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
            if (gridRow === 0) doBounce(direction);
            else { const c = findClosestCol(gridRow, gridCol, 0); setGridRow(0); setGridCol(c); move(); }
            break;
          case 'down':
            if (gridRow === ALL.length - 1) doBounce(direction);
            else { const c = findClosestCol(gridRow, gridCol, 1); setGridRow(1); setGridCol(c); move(); }
            break;
        }
      },
      [region, barIndex, submitEnabled, gridRow, gridCol, doBounce, move]
    );

    const flashPress = useCallback(() => {
      setPressing(true);
      setTimeout(() => setPressing(false), 150);
    }, []);

    // --- Actions -----------------------------------------------------------
    const action = useCallback(
      (act: NavigationAction) => {
        if (act !== 'ok' && act !== 'back') return;

        if (region === 'bar') {
          if (act === 'back') {
            onExit();
            return;
          }
          // ok
          if (barIndex === SUBMIT_INDEX) {
            if (!submitEnabled) { doBounce('right'); return; }
            flashPress();
            soundManager.playSelectionSound();
            onSubmit(slots.filter((s): s is Playlist => s !== null).map((s) => s.id));
            return;
          }
          // OK on a slot → enter the grid to fill it. If the slot is already
          // filled, pre-focus its playlist so the user can swap.
          originSlotRef.current = barIndex;
          const existing = slots[barIndex];
          if (existing) {
            const fRow = FEATURED.some((p) => p.id === existing.id) ? 0 : 1;
            const fCol = ALL[fRow].findIndex((p) => p.id === existing.id);
            setGridRow(fRow);
            setGridCol(Math.max(0, fCol));
          } else {
            setGridRow(0);
            setGridCol(0);
          }
          flashPress();
          soundManager.playSelectionSound();
          setRegion('grid');
          return;
        }

        // region === 'grid'
        if (act === 'back') {
          setRegion('bar');
          setBarIndex(originSlotRef.current);
          soundManager.playSelectionSound();
          return;
        }
        // ok — fill the origin slot with the focused playlist
        const picked = ALL[gridRow][gridCol];
        flashPress();
        soundManager.playSelectionSound();

        setSlots((prev) => {
          const next = [...prev];
          // Enforce uniqueness: clear any other slot holding this playlist.
          for (let i = 0; i < next.length; i++) {
            if (next[i]?.id === picked.id) next[i] = null;
          }
          next[originSlotRef.current] = picked;

          // Advance focus to the next empty slot, else the submit button.
          let nextEmpty = -1;
          for (let i = 0; i < next.length; i++) {
            const idx = (originSlotRef.current + 1 + i) % next.length;
            if (next[idx] === null) { nextEmpty = idx; break; }
          }
          setBarIndex(nextEmpty === -1 ? SUBMIT_INDEX : nextEmpty);
          return next;
        });
        setRegion('bar');
      },
      [region, barIndex, slots, gridRow, gridCol, submitEnabled, onExit, onSubmit, doBounce, flashPress]
    );

    useImperativeHandle(ref, () => ({ navigate, action }), [navigate, action]);

    // --- Focus frame target ------------------------------------------------
    const focusRect: Rect =
      region === 'bar'
        ? barIndex === SUBMIT_INDEX
          ? submitRect()
          : barSlotRect(barIndex)
        : gridRect(gridRow, gridCol);

    const selectedIds = new Set(slots.filter(Boolean).map((s) => (s as Playlist).id));

    return (
      <div
        className="relative w-full h-full overflow-hidden"
        style={{ background: 'linear-gradient(108deg, #1C0C36 0%, #230F43 63.34%, #37186F 100%)' }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/games/song-quiz/playlist-bg.jpg)', opacity: 0.5 }}
        />

        {/* Header label */}
        <div
          className="absolute"
          style={{ left: `${pxToVw(90)}vw`, top: `${pxToVh(38)}vh`, fontSize: '28px', color: 'rgba(255,255,255,0.75)' }}
        >
          Select <span style={{ color: '#FFE88B', fontWeight: 600 }}>1–3 Playlists</span>
        </div>

        {/* Slot bar */}
        {slots.map((slot, i) => {
          const r = barSlotRect(i);
          return (
            <div
              key={i}
              className="absolute flex items-center justify-center overflow-hidden"
              style={{
                left: `${pxToVw(r.x)}vw`,
                top: `${pxToVh(r.y)}vh`,
                width: `${pxToVw(r.w)}vw`,
                height: `${pxToVh(r.h)}vh`,
                borderRadius: '14px',
                background: slot ? 'transparent' : 'rgba(0,0,0,0.35)',
                border: slot ? 'none' : '2px dashed rgba(255,255,255,0.25)',
              }}
            >
              {slot ? (
                <img src={slot.image} alt={slot.title} className="w-full h-full" style={{ objectFit: 'cover' }} draggable={false} />
              ) : (
                <span style={{ fontSize: '52px', color: 'rgba(255,255,255,0.35)', fontWeight: 300 }}>+</span>
              )}
            </div>
          );
        })}

        {/* Submit button */}
        <div
          className="absolute flex items-center justify-center"
          style={{
            left: `${pxToVw(SUBMIT.x)}vw`,
            top: `${pxToVh(SUBMIT.y)}vh`,
            width: `${pxToVw(SUBMIT.w)}vw`,
            height: `${pxToVh(SUBMIT.h)}vh`,
            borderRadius: '14px',
            background: submitEnabled ? 'linear-gradient(180deg, #FFE88B 0%, #F6D300 94.88%)' : 'rgba(255,255,255,0.08)',
            color: submitEnabled ? '#231B00' : 'rgba(255,255,255,0.3)',
            fontSize: '30px',
            fontWeight: 600,
            opacity: submitEnabled ? 1 : 0.6,
            transition: 'background 200ms ease, opacity 200ms ease',
          }}
        >
          Start
        </div>

        {/* Featured row */}
        <RowTitle x={GRID.featured.startX} y={GRID.featured.titleY} label="Featured" />
        {FEATURED.map((p, col) => {
          const r = gridRect(0, col);
          return <GridCard key={p.id} playlist={p} rect={r} selected={selectedIds.has(p.id)} showDescription />;
        })}

        {/* Recently played row */}
        <RowTitle x={GRID.recent.startX} y={GRID.recent.titleY} label="Recently Played" />
        {RECENT.map((p, col) => {
          const r = gridRect(1, col);
          return <GridCard key={p.id} playlist={p} rect={r} selected={selectedIds.has(p.id)} />;
        })}

        {/* Focus frame */}
        <FocusFrame rect={focusRect} bounce={bounce} pressing={pressing} />
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
}: {
  rect: Rect;
  bounce: NavigationDirection | null;
  pressing: boolean;
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
          borderRadius: '16px',
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
