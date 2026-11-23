// ─────────────────────────────────────────────────────────────────────────
//  Production TV hub — layout replica
//
//  Mirrors the prod TV home (Projects/hub apps/client: TvHub/MainMenu
//  HeroArea + GamesCarousel + GameTile) in the prototype's 1920×1080 design
//  space. Numbers come from prod's Variables.scss / HeroArea.module.scss /
//  GamesCarousel.module.scss and are noted where they're used.
//
//  Two focus zones, like prod:
//    · hero  — the band is 900 tall and shows the item's own merch art; a
//              billboard overlays one CTA, a carousel item two game cards.
//              Auto-advances every 6 s with a countdown dot.
//    · grid  — the band clips to 480 and previews the focused tile's game
//              (right-anchored 1422×480 art, logo, description, pills).
//              The focused row parks at the top of the shelf viewport.
// ─────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  CANARY,
  CANARY_LIGHT,
  FONT,
  HERO_ITEMS,
  INK,
  MIDNIGHT,
  STATUS_LABEL,
  WEEKEND_LOGO,
  gamePills,
  scrimStops,
  type HeroItem,
  type HubRow,
  type ProdGame,
} from './catalog';
import { ONBOARDING_ID } from '../hub9/onboarding';

// ── Geometry (design px) ───────────────────────────────────────────────────
const W = 1920;
const H = 1080;
const BAND_FOCUSED = 900; // $hero-area-height-focused
const BAND = 480; // $hero-area-height
const SIDE = 80; // $hero-side-inset
const TILE_W = 368; // $carousel-tile-width-large
const TILE_H = 207;
const TILE_GAP = 32; // $carousel-tile-gap
const STEP = TILE_W + TILE_GAP;
const ROW_TITLE_H = 40;
const ROW_TITLE_GAP = 24;
const ROW_BOX = ROW_TITLE_H + ROW_TITLE_GAP + TILE_H; // 271 $carousel-row-box-large
const ROW_SPACING = 40 + 12; // $carousel-row-gap + $carousel-row-pad-bottom
const TOP_INSET = 28; // $carousel-top-inset
const BOTTOM_INSET = 95; // $carousel-bottom-inset
const PEEK = 130; // SCROLL_PEEK_OFFSET = $carousel-edge-fade
const SHELF_TOP_GRID = BAND + TOP_INSET; // 508 — first row title when the grid has focus
// Collapsed shelf (hero focused): $shelf-rest (180) + top inset (28) + lift (24)
// of the section shows, so the first row's title sits at 876.
const SHELF_COLLAPSED_SHOWN = H - BAND_FOCUSED + TOP_INSET + 24; // 232
const SHELF_TOP_HERO = H - SHELF_COLLAPSED_SHOWN + TOP_INSET; // 876
const PREVIEW_ART_W = 1422; // $hero-preview-art-width
const PREVIEW_FADE_CLEAR = PREVIEW_ART_W - 653;
const BOTTOM_FADE_H = 120;
const AUTO_ADVANCE_MS = 6000;
const SETTLE_MS = 160;
const EASE_TILE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

const ring = (gap: number, stroke: number) => `0 0 0 ${gap}px ${MIDNIGHT}, 0 0 0 ${gap + stroke}px ${CANARY}`;

// ── Scroll maths (prod Carousel/CarouselRow.tsx) ───────────────────────────
const itemLeft = (i: number) => SIDE + i * STEP;
const maxScrollX = (n: number) => Math.max(0, itemLeft(n - 1) + TILE_W + SIDE - W);

function computeScrollX(prev: number, i: number, n: number): number {
  const left = itemLeft(i);
  const right = left + TILE_W;
  if (right + PEEK > prev + W) return Math.min(right - W + PEEK, maxScrollX(n));
  if (left - PEEK < prev) return left - SIDE <= 1 ? 0 : Math.max(0, left - PEEK);
  return prev;
}
const fullyVisible = (prev: number, i: number) => itemLeft(i) >= prev + SIDE - 1 && itemLeft(i) + TILE_W <= prev + W + 1;
function nearestColumn(screenX: number, scrollX: number, n: number): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < n; i++) {
    const d = Math.abs(itemLeft(i) + TILE_W / 2 - scrollX - screenX);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}
const rowTop = (r: number) => r * (ROW_BOX + ROW_SPACING);
function scrollYFor(r: number, rowCount: number): number {
  const wrapperH = rowCount * ROW_BOX + (rowCount - 1) * ROW_SPACING + BOTTOM_INSET;
  const visible = H - SHELF_TOP_GRID;
  return Math.min(Math.max(0, rowTop(r)), Math.max(0, wrapperH - visible));
}

// ── Component ─────────────────────────────────────────────────────────────
type Focus = { zone: 'hero'; col: number } | { zone: 'grid'; row: number; col: number };

export interface ProdTvHubProps {
  rows: HubRow[];
  heroItems?: HeroItem[];
  onLaunch: (game: ProdGame) => void;
  /** Back pressed with the hero focused (nothing left to back out of). */
  onExit?: () => void;
  autoAdvance?: boolean;
  /** Pause keyboard handling (e.g. while a launch overlay is up). */
  inputLocked?: boolean;
}

export function ProdTvHub({ rows, heroItems = HERO_ITEMS, onLaunch, onExit, autoAdvance = true, inputLocked = false }: ProdTvHubProps) {
  const [focus, setFocus] = useState<Focus>({ zone: 'hero', col: 0 });
  const [slide, setSlide] = useState(0);
  const [scrollX, setScrollX] = useState<number[]>(() => rows.map(() => 0));
  const [scrollY, setScrollY] = useState(0);
  const [pressed, setPressed] = useState<string | null>(null);
  const heroFocused = focus.zone === 'hero';
  const focusRef = useRef(focus);
  focusRef.current = focus;
  const slideRef = useRef(slide);
  slideRef.current = slide;
  const item = heroItems[slide];

  // The grid game the band previews — settled, so held arrows don't thrash it.
  const gridGame = focus.zone === 'grid' ? rows[focus.row]?.games[focus.col] : undefined;
  const [settled, setSettled] = useState<ProdGame | undefined>(undefined);
  useEffect(() => {
    if (!gridGame) return;
    const t = window.setTimeout(() => setSettled(gridGame), SETTLE_MS);
    return () => window.clearTimeout(t);
  }, [gridGame]);

  // Auto-advance while the hero holds focus.
  useEffect(() => {
    if (!heroFocused || !autoAdvance || heroItems.length < 2) return;
    const t = window.setTimeout(() => {
      setSlide((s) => (s + 1) % heroItems.length);
      setFocus({ zone: 'hero', col: 0 });
    }, AUTO_ADVANCE_MS);
    return () => window.clearTimeout(t);
  }, [heroFocused, autoAdvance, slide, heroItems.length]);

  const page = useCallback(
    (delta: number) => {
      const next = (slideRef.current + delta + heroItems.length) % heroItems.length;
      // Refs move now so a second key press before the re-render sees this slide.
      slideRef.current = next;
      focusRef.current = { zone: 'hero', col: 0 };
      setSlide(next);
      setFocus({ zone: 'hero', col: 0 });
    },
    [heroItems.length],
  );

  const scrollXRef = useRef(scrollX);
  scrollXRef.current = scrollX;

  const focusGrid = useCallback(
    (r: number, screenX: number | null, colHint?: number) => {
      const n = rows[r].games.length;
      const sx = scrollXRef.current[r];
      const col = colHint ?? (screenX == null ? 0 : nearestColumn(screenX, sx, n));
      const nextSx = fullyVisible(sx, col) ? sx : computeScrollX(sx, col, n);
      if (nextSx !== sx) {
        setScrollX((prev) => {
          const copy = [...prev];
          copy[r] = nextSx;
          return copy;
        });
      }
      setFocus({ zone: 'grid', row: r, col });
      setScrollY(scrollYFor(r, rows.length));
    },
    [rows],
  );

  const launch = useCallback(
    (game: ProdGame, key: string) => {
      setPressed(key);
      window.setTimeout(() => setPressed(null), 200);
      onLaunch(game);
    },
    [onLaunch],
  );


  const handleKey = useCallback(
    (key: string) => {
      const f = focusRef.current;
      const item = heroItems[slideRef.current];
      if (f.zone === 'hero') {
        const cards = item.kind === 'carousel' ? item.games.length : 1;
        switch (key) {
          case 'left':
            if (f.col > 0) setFocus((focusRef.current = { zone: 'hero', col: f.col - 1 }));
            else page(-1);
            return;
          case 'right':
            if (f.col < cards - 1) setFocus((focusRef.current = { zone: 'hero', col: f.col + 1 }));
            else page(1);
            return;
          case 'down':
            focusGrid(0, null, undefined);
            return;
          case 'ok':
            if (item.kind === 'billboard') launch(item.game, 'cta');
            else launch(item.games[f.col], `card-${f.col}`);
            return;
          case 'back':
            onExit?.();
            return;
        }
        return;
      }
      const n = rows[f.row].games.length;
      const screenX = itemLeft(f.col) + TILE_W / 2 - scrollXRef.current[f.row];
      switch (key) {
        case 'left':
        case 'right': {
          const col = Math.min(n - 1, Math.max(0, f.col + (key === 'left' ? -1 : 1)));
          if (col === f.col) return;
          setScrollX((prev) => {
            const copy = [...prev];
            copy[f.row] = computeScrollX(prev[f.row], col, n);
            return copy;
          });
          setFocus({ zone: 'grid', row: f.row, col });
          return;
        }
        case 'up':
          if (f.row === 0) {
            setFocus({ zone: 'hero', col: 0 });
            setScrollY(0);
          } else focusGrid(f.row - 1, screenX);
          return;
        case 'down':
          if (f.row < rows.length - 1) focusGrid(f.row + 1, screenX);
          return;
        case 'ok':
          launch(rows[f.row].games[f.col], `${f.row}-${f.col}`);
          return;
        case 'back':
          // Back from the grid lifts focus to the hero first (prod #1442).
          setFocus({ zone: 'hero', col: 0 });
          setScrollY(0);
          return;
      }
    },
    [heroItems, page, focusGrid, rows, launch, onExit],
  );

  useEffect(() => {
    if (inputLocked) return;
    const map: Record<string, string> = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowUp: 'up',
      ArrowDown: 'down',
      Enter: 'ok',
      Escape: 'back',
      Backspace: 'back',
    };
    const onKey = (e: KeyboardEvent) => {
      const k = map[e.key];
      if (!k) return;
      e.preventDefault();
      handleKey(k);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleKey, inputLocked]);

  const contentOffset = (y: number): CSSProperties => ({ transform: `translateY(${-y}px)` });
  const shelfTop = heroFocused ? SHELF_TOP_HERO : SHELF_TOP_GRID;

  return (
    <div style={{ position: 'absolute', inset: 0, background: MIDNIGHT, overflow: 'hidden', fontFamily: FONT, color: INK }}>
      <style>{KEYFRAMES}</style>

      {/* ── Hero band ─────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: W,
          height: BAND_FOCUSED,
          clipPath: heroFocused ? 'inset(0)' : `inset(0 0 ${BAND_FOCUSED - BAND}px 0)`,
          transition: 'clip-path 0.3s ease',
          zIndex: 20,
          background: MIDNIGHT,
        }}
      >
        {/* Hero-focused art: every item's own 1920×900 creative, crossfaded. */}
        {heroItems.map((h, i) => (
          <img
            key={h.key}
            src={h.art}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: W,
              height: BAND_FOCUSED,
              objectFit: 'cover',
              opacity: heroFocused && i === slide ? 1 : 0,
              transition: 'opacity 0.45s ease',
            }}
          />
        ))}
        {/* Grid-focused art: the settled game's 1422×480 preview, right-anchored. */}
        {!heroFocused && settled?.preview && (
          <img
            key={`art-${settled.id}`}
            src={settled.preview}
            alt=""
            style={{ position: 'absolute', top: 0, right: 0, width: PREVIEW_ART_W, height: BAND, objectFit: 'cover', animation: 'prodFadeIn 0.35s ease both' }}
          />
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: `linear-gradient(to right, ${MIDNIGHT} 0%, ${scrimStops((t) => `${W - PREVIEW_ART_W + (PREVIEW_ART_W - PREVIEW_FADE_CLEAR) * t}px`)})`,
            opacity: heroFocused ? 0 : 1,
            transition: heroFocused ? 'opacity 0.45s ease' : 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: heroFocused ? 0 : BAND_FOCUSED - BAND,
            height: BOTTOM_FADE_H,
            pointerEvents: 'none',
            background: `linear-gradient(to top, ${scrimStops((t) => `${t * 100}%`)})`,
          }}
        />

        <img src={WEEKEND_LOGO} alt="Weekend" style={{ position: 'absolute', top: 44, left: SIDE, height: 48 }} />

        {!heroFocused && settled && settled.id !== ONBOARDING_ID && <PreviewOverlay key={`overlay-${settled.id}`} game={settled} />}

        {item.kind === 'billboard' && (
          <div
            style={{
              position: 'absolute',
              left: SIDE + 20,
              right: SIDE + 20,
              bottom: 150,
              display: 'flex',
              opacity: heroFocused ? 1 : 0,
              transition: 'opacity 0.25s ease',
              ...contentOffset(item.contentOffsetY),
            }}
          >
            <CtaButton label={item.ctaLabel} focused={heroFocused} onClick={() => launch(item.game, 'cta')} />
          </div>
        )}
        {item.kind === 'carousel' && (
          <div
            style={{
              position: 'absolute',
              left: SIDE + 15,
              right: SIDE,
              bottom: 96,
              display: 'flex',
              alignItems: 'flex-end',
              gap: TILE_GAP,
              justifyContent: { left: 'flex-start', right: 'flex-end', center: 'center', split: 'space-between' }[item.orientation],
              opacity: heroFocused ? 1 : 0,
              transition: 'opacity 0.25s ease',
              ...contentOffset(item.contentOffsetY),
            }}
          >
            {item.games.map((game, c) => {
              const on = heroFocused && focus.col === c;
              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => {
                    if (on) launch(game, `card-${c}`);
                    else setFocus({ zone: 'hero', col: c });
                  }}
                  style={{
                    position: 'relative',
                    width: 254,
                    height: 143,
                    padding: 0,
                    border: 0,
                    borderRadius: 16,
                    overflow: 'hidden',
                    background: '#141518',
                    cursor: 'pointer',
                    flex: 'none',
                    opacity: on ? 1 : 0.72,
                    transform: `scale(${on ? (pressed === `card-${c}` ? 0.98 : 1.06) : 1})`,
                    boxShadow: on ? ring(6, 5) : 'none',
                    transition: `transform 0.24s ${EASE_TILE}`,
                  }}
                >
                  <img src={game.tile} alt={game.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              );
            })}
          </div>
        )}

        {heroFocused && heroItems.length > 1 && (
          <div style={{ position: 'absolute', bottom: 44, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 12 }}>
            {heroItems.map((h, i) => (
              <span
                key={h.key}
                style={{
                  position: 'relative',
                  width: i === slide ? 36 : 12,
                  height: 12,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.4)',
                  overflow: 'hidden',
                  transition: 'width 0.3s ease',
                }}
              >
                {i === slide && (
                  <span
                    key={`${slide}-${autoAdvance}`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: 0,
                      borderRadius: 'inherit',
                      background: CANARY,
                      width: autoAdvance ? 12 : '100%',
                      animation: autoAdvance ? `prodDotFill ${AUTO_ADVANCE_MS}ms linear forwards` : undefined,
                    }}
                  />
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Shelf ─────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          width: W,
          top: 0,
          height: H,
          zIndex: heroFocused ? 21 : 10,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            width: W,
            top: 0,
            transform: `translate3d(0, ${shelfTop - scrollY}px, 0)`,
            transition: 'transform 0.3s ease',
            pointerEvents: 'auto',
          }}
        >
          {rows.map((row, r) => (
            <Row
              key={row.key}
              row={row}
              index={r}
              scrollX={scrollX[r]}
              focusedCol={focus.zone === 'grid' && focus.row === r ? focus.col : -1}
              pressed={pressed}
              onTileClick={(c) => {
                if (focus.zone === 'grid' && focus.row === r && focus.col === c) launch(row.games[c], `${r}-${c}`);
                else focusGrid(r, null, c);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Pieces ────────────────────────────────────────────────────────────────

function Row({
  row,
  index,
  scrollX,
  focusedCol,
  pressed,
  onTileClick,
}: {
  row: HubRow;
  index: number;
  scrollX: number;
  focusedCol: number;
  pressed: string | null;
  onTileClick: (col: number) => void;
}) {
  const n = row.games.length;
  const contentRight = itemLeft(n - 1) + TILE_W;
  return (
    <div style={{ position: 'absolute', top: rowTop(index), left: 0, width: W, height: ROW_BOX }}>
      <div
        style={{
          height: ROW_TITLE_H,
          marginBottom: ROW_TITLE_GAP,
          paddingLeft: SIDE,
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: '-0.01em',
          lineHeight: `${ROW_TITLE_H}px`,
          whiteSpace: 'nowrap',
        }}
      >
        {row.title}
      </div>
      <div style={{ position: 'relative', width: W, height: TILE_H }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            display: 'flex',
            gap: TILE_GAP,
            paddingLeft: SIDE,
            transform: `translate3d(${-scrollX}px, 0, 0)`,
            transition: 'transform 0.3s ease',
          }}
        >
          {row.games.map((game, c) => (
            <Tile
              key={`${game.id}-${c}`}
              game={game}
              focused={focusedCol === c}
              pressed={pressed === `${index}-${c}`}
              intro={index === 0 && c < 6 ? c : -1}
              onClick={() => onTileClick(c)}
            />
          ))}
        </div>
        <div
          style={{
            position: 'absolute',
            top: -12,
            bottom: -12,
            left: 0,
            width: PEEK,
            pointerEvents: 'none',
            background: `linear-gradient(to left, transparent, ${MIDNIGHT})`,
            opacity: scrollX > 0 ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: -12,
            bottom: -12,
            right: 0,
            width: PEEK,
            pointerEvents: 'none',
            background: `linear-gradient(to right, transparent, ${MIDNIGHT})`,
            opacity: contentRight - scrollX > W ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}

function Tile({ game, focused, pressed, intro, onClick }: { game: ProdGame; focused: boolean; pressed: boolean; intro: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={game.title}
      style={{
        position: 'relative',
        width: TILE_W,
        height: TILE_H,
        flex: 'none',
        padding: 0,
        border: 0,
        borderRadius: 16,
        background: '#141518',
        cursor: 'pointer',
        zIndex: focused ? 10 : 0,
        transform: `scale(${focused ? (pressed ? 0.98 : 1.06) : 1})`,
        boxShadow: focused ? ring(6, 5) : 'none',
        transition: `transform 0.24s ${EASE_TILE}`,
        animation: intro >= 0 ? `prodShelfIntro 520ms ${240 + intro * 60}ms backwards` : undefined,
      }}
    >
      {game.id === ONBOARDING_ID ? (
        <OnboardingArt />
      ) : (
        <img src={game.tile} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 16, objectFit: 'cover' }} />
      )}
      {game.status && <StatusTag status={game.status} />}
    </button>
  );
}

function OnboardingArt() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 16,
        overflow: 'hidden',
        background: 'radial-gradient(120% 140% at 85% 10%, #4a2fa0 0%, #1d0f4a 45%, #0a0322 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        padding: 24,
        boxSizing: 'border-box',
        textAlign: 'left',
      }}
    >
      <img src={WEEKEND_LOGO} alt="" style={{ height: 34, marginBottom: 12 }} />
      <div style={{ fontFamily: FONT, fontSize: 26, fontWeight: 700, color: INK, lineHeight: 1.1 }}>Welcome to Weekend</div>
    </div>
  );
}

export function StatusTag({ status, scale = 1 }: { status: NonNullable<ProdGame['status']>; scale?: number }) {
  const isNew = status === 'new';
  const s = (px: number) => px * scale;
  return (
    <span
      style={{
        position: 'absolute',
        top: s(12),
        left: s(12),
        zIndex: 2,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        minWidth: s(54),
        height: s(27),
        padding: `0 ${s(8)}px`,
        borderRadius: s(6),
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: s(status === 'coming-soon' ? 14 : 17),
        letterSpacing: isNew ? s(1.1) : undefined,
        lineHeight: `${s(13)}px`,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        ...(isNew
          ? {
              border: `${s(1)}px solid #feed75`,
              background: 'linear-gradient(180deg, #ffec37 0%, #fcde2f 83.17%, #fcdb2d 100%)',
              boxShadow: `0 ${s(4)}px ${s(4)}px rgba(0,0,0,0.25)`,
              color: MIDNIGHT,
            }
          : { background: 'rgba(0,0,0,0.64)', boxShadow: `0 ${s(4)}px ${s(8)}px rgba(0,0,0,0.25)`, color: CANARY }),
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function CtaButton({ label, focused, onClick }: { label: string; focused: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        minWidth: 80,
        height: 56,
        padding: '0 34px',
        borderRadius: 9999,
        cursor: 'pointer',
        fontFamily: FONT,
        fontSize: 24,
        fontWeight: 500,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        transition: `transform 0.22s ${EASE_TILE}`,
        ...(focused
          ? {
              background: `linear-gradient(180deg, ${CANARY_LIGHT} 0%, ${CANARY} 100%)`,
              border: `1px solid ${CANARY}`,
              color: MIDNIGHT,
              transform: 'scale(1.04)',
              boxShadow: '0 6px 22px rgba(255,228,1,0.35), 0 12px 30px rgba(0,0,0,0.6)',
            }
          : { background: MIDNIGHT, border: '1px solid rgba(243,244,241,0.2)', color: INK }),
      }}
    >
      {label}
    </button>
  );
}

/** Contain-fit a logo at its designed size within 720×180 (HeroPreviewOverlay). */
export function useLogoSize(game: ProdGame, maxW: number, maxH: number) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const onLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const k = game.logoScale ?? 1;
    const w = img.naturalWidth / k;
    const h = img.naturalHeight / k;
    const fit = Math.min(1, maxW / w, maxH / h);
    setSize({ w: w * fit, h: h * fit });
  };
  return { size, onLoad };
}

function PreviewOverlay({ game }: { game: ProdGame }) {
  const pills = useMemo(() => gamePills(game), [game]);
  const { size, onLoad } = useLogoSize(game, 720, 180);
  return (
    <div
      style={{
        position: 'absolute',
        left: SIDE,
        bottom: BAND_FOCUSED - BAND + 24,
        width: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 22,
        animation: 'prodFadeIn 0.3s ease both',
      }}
    >
      {game.logo && (
        <img
          src={game.logo}
          alt={game.title}
          onLoad={onLoad}
          style={{ display: 'block', width: size?.w, height: size?.h, objectFit: 'contain', objectPosition: 'left bottom', visibility: size ? 'visible' : 'hidden' }}
        />
      )}
      {game.description && (
        <p
          style={{
            margin: 0,
            maxWidth: 760,
            fontSize: 24,
            lineHeight: '32px',
            color: 'rgba(243,244,241,0.82)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {game.description}
        </p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 13 }}>
        {pills.map((p) => (
          <span key={p.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 12, height: 52, padding: '0 16px', borderRadius: 8, background: 'rgba(255,255,255,0.12)', whiteSpace: 'nowrap' }}>
            <img src={p.icon} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
            <span style={{ fontSize: 24, fontWeight: 500, lineHeight: '32px' }}>{p.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

const KEYFRAMES = `
@keyframes prodFadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes prodDotFill { from { width: 12px } to { width: 100% } }
@keyframes prodShelfIntro {
  0%   { opacity: 0; transform: translate3d(0, 32px, 0); animation-timing-function: cubic-bezier(0.16, 0.68, 0.3, 1); }
  58%  { opacity: 1; transform: translate3d(0, -11px, 0); animation-timing-function: cubic-bezier(0.45, 0, 0.55, 1); }
  80%  { transform: translate3d(0, 4px, 0); animation-timing-function: cubic-bezier(0.45, 0, 0.4, 1); }
  100% { opacity: 1; transform: translate3d(0, 0, 0); }
}
@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
`;
