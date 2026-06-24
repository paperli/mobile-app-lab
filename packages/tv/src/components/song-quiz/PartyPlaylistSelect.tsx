import {
  forwardRef,
  Fragment,
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
 * A vertically-scrolling list of rows (Featured + standard rows), each of which
 * scrolls horizontally. Two focus regions:
 *   - "grid"     : the rows. OK toggles a playlist's checkbox (up to
 *                  MAX_SELECTED, FIFO once full). Moving up/down changes row and
 *                  scrolls the list minimally to keep the focused row in view;
 *                  left/right scrolls within the row.
 *   - "continue" : the top-right Continue button. Disabled until ≥1 playlist is
 *                  selected; reached by pressing up from the first row. OK confirms.
 *
 * Back steps up: from the grid with a selection it focuses Continue, otherwise
 * it exits to the Song Quiz menu; from Continue it exits to the menu. App.tsx
 * forwards directional / action input here via the imperative handle, the same
 * way it drives SystemMenuOverlay.
 */

// ---------------------------------------------------------------------------
// Data — covers exported from the Song Quiz TV Figma into public/.../playlists.
// ---------------------------------------------------------------------------

interface Playlist {
  id: string;
  title: string;
  description?: string;
  image: string;
}

interface RowDef {
  key: string;
  title: string;
  variant: 'featured' | 'standard';
  items: Playlist[];
}

const ART = '/games/song-quiz/playlists';

const ROWS: RowDef[] = [
  {
    key: 'featured',
    title: 'Featured',
    variant: 'featured',
    items: [
      { id: 'f0', title: "Today's Top Hits", description: 'Chart-toppers you should definitely recognize!', image: `${ART}/f0.png` },
      { id: 'f1', title: '2020s', description: 'Modern-day bangers. Are you keeping up?', image: `${ART}/f1.png` },
      { id: 'f2', title: 'Songs of the Summer', description: 'Heatwave hits for beach days & barbecues.', image: `${ART}/f2.png` },
    ],
  },
  {
    key: 'recent',
    title: 'Recently Played',
    variant: 'standard',
    items: [
      { id: 'r0', title: "Today's Top Hits", image: `${ART}/r0.png` },
      { id: 'r1', title: 'Hip Hop Classics', image: `${ART}/r1.png` },
      { id: 'r2', title: 'Animated Classics', image: `${ART}/r2.png` },
      { id: 'r3', title: '2020s', image: `${ART}/r3.png` },
      { id: 'r4', title: '2010s', image: `${ART}/r4.png` },
    ],
  },
  {
    key: 'popular',
    title: 'Popular',
    variant: 'standard',
    items: [
      { id: 'p0', title: 'Black Country Excellence', image: `${ART}/p0.png` },
      { id: 'p1', title: 'Wicked + Broadway', image: `${ART}/p1.png` },
      { id: 'p2', title: 'K-Pop', image: `${ART}/p2.png` },
      { id: 'p3', title: 'Kids Movies', image: `${ART}/p3.png` },
      { id: 'p4', title: 'Cinco De Mayo Bangers', image: `${ART}/p4.png` },
      { id: 'p5', title: 'Electric Daisy Carnival', image: `${ART}/p5.png` },
      { id: 'p6', title: 'Aquarius Season', image: `${ART}/p6.png` },
      { id: 'p7', title: 'Britpop', image: `${ART}/p7.png` },
      { id: 'p8', title: 'Family', image: `${ART}/p8.png` },
      { id: 'p9', title: 'British Rock', image: `${ART}/p9.png` },
      { id: 'p10', title: 'All Time Pop', image: `${ART}/p10.png` },
    ],
  },
  {
    key: 'decades',
    title: 'Decades',
    variant: 'standard',
    items: [
      { id: 'd0', title: '2020s', image: `${ART}/d0.png` },
      { id: 'd1', title: '2010s', image: `${ART}/d1.png` },
      { id: 'd2', title: '2000s', image: `${ART}/d2.png` },
      { id: 'd3', title: '90s', image: `${ART}/d3.png` },
      { id: 'd4', title: '80s', image: `${ART}/d4.png` },
      { id: 'd5', title: '70s', image: `${ART}/d5.png` },
      { id: 'd6', title: '60s', image: `${ART}/d6.png` },
      { id: 'd7', title: "40s & 50s", image: `${ART}/d7.png` },
    ],
  },
  {
    key: 'all',
    title: 'All Playlists',
    variant: 'standard',
    items: [
      { id: 'a0', title: 'Classic Country', image: `${ART}/a0.png` },
      { id: 'a1', title: 'Britpop', image: `${ART}/a1.png` },
      { id: 'a2', title: '2000s Warped Tour Hits', image: `${ART}/a2.png` },
      { id: 'a3', title: 'Rock of All Ages', image: `${ART}/a3.png` },
      { id: 'a4', title: 'Hip Hop Classics', image: `${ART}/a4.png` },
      { id: 'a5', title: 'Emo Kids', image: `${ART}/a5.png` },
      { id: 'a6', title: 'Dance Anthems', image: `${ART}/a6.png` },
      { id: 'a7', title: 'Soul and Funk', image: `${ART}/a7.png` },
      { id: 'a8', title: 'K-Pop', image: `${ART}/a8.png` },
      { id: 'a9', title: 'Family', image: `${ART}/a9.png` },
      { id: 'a10', title: 'British Rock', image: `${ART}/a10.png` },
      { id: 'a11', title: 'All Time Pop', image: `${ART}/a11.png` },
    ],
  },
];

const MAX_SELECTED = 3;

// ---------------------------------------------------------------------------
// Layout — px at 1920x1080 reference, converted to vw/vh so it scales.
// ---------------------------------------------------------------------------

const pxToVw = (px: number) => (px / 1920) * 100;
const pxToVh = (px: number) => (px / 1080) * 100;

const VIEW_W = 1920;
const VIEW_H = 1080;
const START_X = 90;
const COL_GAP = 64;
const SIDE_MARGIN = 90; // left/right keep-in-view margin for horizontal scroll
const FEATURED = { w: 532, h: 237 };
const STANDARD = { w: 234, h: 234 };

const TITLE_H = 38;
const TITLE_GAP = 16;
const FEAT_LABEL = 96; // title + description below a featured card
const STD_LABEL = 44; // title below a standard card
const ROW_GAP = 56;
const TOP_SAFE = 243; // focused row title won't scroll above this
const BOTTOM_SAFE = 1040; // focused row block stays above this
const BOTTOM_PAD = 48;

// Continue button — top-right, anchored to the grid's right edge. Content-sized,
// so its focus rect is measured from the rendered element at runtime.
const CONTINUE = { top: 90, right: 90 };

const FRAME_MARGIN = 0.5; // vw

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface RowLayout {
  titleY: number;
  cardsY: number;
  cardW: number;
  cardH: number;
  stride: number;
  label: number;
  blockBottom: number;
}

const LAYOUT: RowLayout[] = (() => {
  const out: RowLayout[] = [];
  let y = TOP_SAFE;
  for (const row of ROWS) {
    const feat = row.variant === 'featured';
    const cardW = feat ? FEATURED.w : STANDARD.w;
    const cardH = feat ? FEATURED.h : STANDARD.h;
    const label = feat ? FEAT_LABEL : STD_LABEL;
    const cardsY = y + TITLE_H + TITLE_GAP;
    const blockBottom = cardsY + cardH + label;
    out.push({ titleY: y, cardsY, cardW, cardH, stride: cardW + COL_GAP, label, blockBottom });
    y = blockBottom + ROW_GAP;
  }
  return out;
})();

const CONTENT_H = LAYOUT[LAYOUT.length - 1].blockBottom + BOTTOM_PAD;
const MAX_SCROLL = Math.max(0, CONTENT_H - VIEW_H);

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

function cardX(rowIdx: number, col: number): number {
  return START_X + col * LAYOUT[rowIdx].stride;
}

// Horizontal offset that keeps the focused (or remembered) card of a row in view.
function rowOffsetX(rowIdx: number, col: number): number {
  const L = LAYOUT[rowIdx];
  const right = cardX(rowIdx, col) + L.cardW;
  let off = right > VIEW_W - SIDE_MARGIN ? right - (VIEW_W - SIDE_MARGIN) : 0;
  const lastRight = START_X + (ROWS[rowIdx].items.length - 1) * L.stride + L.cardW;
  const maxOff = Math.max(0, lastRight + SIDE_MARGIN - VIEW_W);
  return clamp(off, 0, maxOff);
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
    const [focusRow, setFocusRow] = useState(0);
    // Focused/remembered column per row, so each row keeps its scroll position.
    const [colByRow, setColByRow] = useState<number[]>(() => ROWS.map(() => 0));
    const [scrollY, setScrollY] = useState(0);
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
      document.fonts?.ready.then(measure).catch(() => {});
      return () => window.removeEventListener('resize', measure);
    }, []);

    const doBounce = useCallback((direction: NavigationDirection) => {
      setBounce(direction);
      setTimeout(() => setBounce(null), 200);
      soundManager.playBounceSound();
    }, []);

    const move = useCallback(() => soundManager.playNavigationSound(), []);

    const setCol = useCallback((rowIdx: number, col: number) => {
      setColByRow((prev) => {
        if (prev[rowIdx] === col) return prev;
        const next = [...prev];
        next[rowIdx] = col;
        return next;
      });
    }, []);

    // Scroll the list the minimum needed to keep row `r` within the safe band.
    const ensureRowVisible = useCallback((r: number) => {
      setScrollY((prev) => {
        const { titleY, blockBottom } = LAYOUT[r];
        let s = prev;
        if (titleY - s < TOP_SAFE) s = titleY - TOP_SAFE;
        else if (blockBottom - s > BOTTOM_SAFE) s = blockBottom - BOTTOM_SAFE;
        return clamp(s, 0, MAX_SCROLL);
      });
    }, []);

    // --- Navigation --------------------------------------------------------
    const navigate = useCallback(
      (direction: NavigationDirection) => {
        if (region === 'continue') {
          if (direction === 'down') { setRegion('grid'); move(); }
          else doBounce(direction);
          return;
        }

        // region === 'grid'
        const col = colByRow[focusRow];
        const count = ROWS[focusRow].items.length;
        switch (direction) {
          case 'left':
            if (col === 0) doBounce(direction);
            else { setCol(focusRow, col - 1); move(); }
            break;
          case 'right':
            if (col >= count - 1) doBounce(direction);
            else { setCol(focusRow, col + 1); move(); }
            break;
          case 'up':
            if (focusRow === 0) {
              if (continueEnabled) { setRegion('continue'); move(); }
              else doBounce(direction);
            } else {
              const nr = focusRow - 1;
              setFocusRow(nr);
              ensureRowVisible(nr);
              move();
            }
            break;
          case 'down':
            if (focusRow >= ROWS.length - 1) doBounce(direction);
            else {
              const nr = focusRow + 1;
              setFocusRow(nr);
              ensureRowVisible(nr);
              move();
            }
            break;
        }
      },
      [region, continueEnabled, focusRow, colByRow, doBounce, move, setCol, ensureRowVisible]
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
          if (continueEnabled) {
            setRegion('continue');
            soundManager.playSelectionSound();
          } else {
            onExit();
          }
          return;
        }
        if (act === 'ok') {
          const picked = ROWS[focusRow].items[colByRow[focusRow]];
          setSelected((prev) => {
            if (prev.includes(picked.id)) {
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
      [region, continueEnabled, focusRow, colByRow, selected, onExit, onSubmit, flashPress]
    );

    useImperativeHandle(ref, () => ({ navigate, action }), [navigate, action]);

    // --- Render ------------------------------------------------------------
    const selectedSet = new Set(selected);

    const focusCol = colByRow[focusRow];
    const focusL = LAYOUT[focusRow];
    const gridFocusRect: Rect = {
      x: cardX(focusRow, focusCol) - rowOffsetX(focusRow, focusCol),
      y: focusL.cardsY,
      w: focusL.cardW,
      h: focusL.cardH,
    };
    const continueFallback: Rect = { x: 1920 - CONTINUE.right - 196, y: CONTINUE.top, w: 196, h: 64 };

    return (
      <div
        className="relative w-full h-full overflow-hidden"
        style={{ background: 'linear-gradient(108deg, #1C0C36 0%, #230F43 63.34%, #37186F 100%)' }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/games/song-quiz/playlist-bg.jpg)', opacity: 0.35 }}
        />

        {/* Scrolling row list (translated vertically). */}
        <div
          className="absolute inset-0"
          style={{
            zIndex: 1,
            transform: `translateY(${-pxToVh(scrollY)}vh)`,
            transition: 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {ROWS.map((row, rowIdx) => {
            const L = LAYOUT[rowIdx];
            const off = rowOffsetX(rowIdx, colByRow[rowIdx]);
            return (
              <Fragment key={row.key}>
                <div
                  className="absolute"
                  style={{ left: `${pxToVw(START_X)}vw`, top: `${pxToVh(L.titleY)}vh`, fontSize: '30px', color: 'rgba(255,255,255,0.75)' }}
                >
                  {row.title}
                </div>
                <div
                  className="absolute"
                  style={{ left: 0, right: 0, top: `${pxToVh(L.cardsY)}vh`, height: `${pxToVh(L.cardH + L.label)}vh` }}
                >
                  <div
                    className="absolute inset-0"
                    style={{ transform: `translateX(${-pxToVw(off)}vw)`, transition: 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)' }}
                  >
                    {row.items.map((p, col) => (
                      <GridCard
                        key={p.id}
                        playlist={p}
                        contentX={cardX(rowIdx, col)}
                        w={L.cardW}
                        h={L.cardH}
                        variant={row.variant}
                        selected={selectedSet.has(p.id)}
                      />
                    ))}
                  </div>
                </div>
              </Fragment>
            );
          })}

          {/* Grid focus frame — scrolls with the rows. */}
          {region === 'grid' && <FocusFrame rect={gridFocusRect} bounce={bounce} pressing={pressing} />}
        </div>

        {/* Top mask — hides rows scrolling up behind the logo + header. Stays
            opaque through the "Select 1–3 Playlists" hint, then fades out. Only
            shown once the list is scrolled (i.e. content is overflowing up). */}
        <div
          className="absolute left-0 right-0 top-0 pointer-events-none"
          style={{
            zIndex: 5,
            height: `${pxToVh(300)}vh`,
            background: 'linear-gradient(to bottom, #1C0C36 0%, #1C0C36 72%, #1F0D3C 84%, rgba(31,13,60,0) 100%)',
            opacity: scrollY > 0 ? 1 : 0,
            transition: 'opacity 220ms ease',
          }}
        />

        {/* Song Quiz logo — centered top. */}
        <img
          src="/games/song-quiz/song-quiz-logo.png"
          alt="Song Quiz"
          className="absolute"
          style={{
            top: `${pxToVh(90)}vh`,
            left: '50%',
            transform: 'translateX(-50%)',
            width: `${pxToVw(543)}vw`,
            height: `${pxToVh(66)}vh`,
            zIndex: 10,
          }}
          draggable={false}
        />

        {/* Header */}
        <div
          className="absolute left-0 right-0 flex items-center justify-center text-hint"
          style={{ top: `${pxToVh(172)}vh`, color: 'rgba(255,255,255,0.9)', zIndex: 10 }}
        >
          <span>
            Select <span style={{ color: '#FFE88B', fontWeight: 600 }}>1–3 Playlists</span>
          </span>
        </div>

        {/* Continue button (top-right). Content-sized; disabled until a playlist is chosen. */}
        <div
          ref={continueElRef}
          className="absolute inline-flex items-center justify-center text-callout"
          style={{
            top: `${pxToVh(CONTINUE.top)}vh`,
            right: `${pxToVw(CONTINUE.right)}vw`,
            zIndex: 20,
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

        {/* Continue focus frame — fixed (screen space), shown when focused. */}
        {region === 'continue' && (
          <div className="absolute inset-0" style={{ zIndex: 25 }}>
            <FocusFrame rect={continueBox ?? continueFallback} bounce={bounce} pressing={pressing} radius={9999} />
          </div>
        )}
      </div>
    );
  }
);

// ---------------------------------------------------------------------------
// Presentational helpers
// ---------------------------------------------------------------------------

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
  contentX,
  w,
  h,
  variant,
  selected,
}: {
  playlist: Playlist;
  contentX: number;
  w: number;
  h: number;
  variant: 'featured' | 'standard';
  selected: boolean;
}) {
  return (
    <div
      className="absolute"
      style={{ left: `${pxToVw(contentX)}vw`, top: 0, width: `${pxToVw(w)}vw` }}
    >
      <div className="relative" style={{ width: `${pxToVw(w)}vw`, height: `${pxToVh(h)}vh` }}>
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
      {variant === 'featured' && playlist.description && (
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
