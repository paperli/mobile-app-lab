// Reusable showcase versions of the hub's shelf / grid building blocks, used by
// the components Playground. These mirror the geometry, focus treatment and art
// primitives used inside GameHub (Tile / category shelf / All-Games grid / promo
// banner / hero) so the playground documents the *real* component types.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { layout, tileHeight } from '@weekend/ui';
import { QRCodeSVG } from 'qrcode.react';
import { HUB_GAMES, type HubGame } from '../prototype/hub/games';
import { GameArt } from '../prototype/hub/GameArt';
import { GameLogo } from '../prototype/hub/GameLogo';
import { GameMetaPills } from '../prototype/hub/MetadataPill';
import { Screenshot, SHOT_VARIANTS } from '../prototype/hub/Screenshot';

const FONT = "'Weekend Repro', ui-sans-serif, system-ui, sans-serif";
const INK = '#F3F4F1';
const INK_DIM = '#c9cacc';
const STAGE_BG = '#0a0b0d';
// Shared hub layout tokens (see @weekend/ui). Mirrors GameHub exactly so the
// playground documents the real geometry: one gap / radius / gutter for every
// role, standard + grid share a width, featured uses the 2x tile.
const SHELF_PAD = layout.shelfGutter;
const GRID_COLS = 4;

type TileVariant = 'sm' | 'lg' | 'grid';
const TILE = {
  sm: { w: layout.tile.w, h: tileHeight(layout.tile.w), r: layout.tile.radius, gap: layout.shelfGap },
  lg: { w: layout.tile.wFeatured, h: tileHeight(layout.tile.wFeatured), r: layout.tile.radius, gap: layout.shelfGap },
  grid: { w: layout.tile.w, h: tileHeight(layout.tile.w), r: layout.tile.radius, gap: layout.shelfGap },
} as const;

/* Faked "live players" count for the PLAYING chip — deterministic per game (so
   it stays stable across re-renders) and clamped to the 103–999 range. Mirrors
   the helper of the same name in GameHub. */
function fakePlayingCount(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return 103 + (h % (999 - 103 + 1));
}

// ── Fit-to-container stage ────────────────────────────────────────────────────
// The hub renders at a fixed 1920-px design width; here each example declares its
// own design box and is scaled down to the card width (grayscaled to match the
// hub's B&W mockup treatment).
function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function ScaledStage({ designW, designH, children }: { designW: number; designH: number; children: ReactNode }) {
  const [ref, w] = useElementWidth<HTMLDivElement>();
  const scale = w > 0 ? w / designW : 0;
  return (
    <div ref={ref} style={{ width: '100%', height: designH * scale, overflow: 'hidden', background: STAGE_BG }}>
      <div
        style={{
          width: designW,
          height: designH,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          filter: 'grayscale(1) contrast(1.03)',
          fontFamily: FONT,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Tile (matches GameHub's Tile) ─────────────────────────────────────────────
function KitTile({
  game,
  variant,
  focused,
  slideshow = false,
  badge,
}: {
  game: HubGame;
  variant: TileVariant;
  focused?: boolean;
  slideshow?: boolean;
  /** Optional corner tag, e.g. "NEW". */
  badge?: string;
}) {
  const t = TILE[variant];
  const [shot, setShot] = useState(0);
  const [ready, setReady] = useState(false); // 1s delay before the slideshow starts
  const showShots = slideshow && !!focused && ready;
  useEffect(() => {
    setShot(0);
    setReady(false);
    if (!slideshow || !focused) return;
    let id: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      setReady(true);
      id = setInterval(() => setShot((s) => (s + 1) % SHOT_VARIANTS.length), 1300);
    }, 1000);
    return () => {
      clearTimeout(start);
      if (id) clearInterval(id);
    };
  }, [slideshow, focused]);

  return (
    <div
      style={{
        position: 'relative',
        flex: '0 0 auto',
        width: t.w,
        height: t.h,
        borderRadius: t.r,
        overflow: 'hidden',
        background: '#141518',
        transform: focused ? 'scale(1.06)' : 'scale(1)',
        boxShadow: focused ? '0 0 0 4px #fff, 0 26px 60px rgba(0,0,0,0.7)' : 'none',
        zIndex: focused ? 3 : 1,
      }}
    >
      {/* Corner tag (e.g. "NEW") pinned above the art. */}
      {badge && (
        <span
          style={{
            position: 'absolute',
            top: variant === 'grid' ? 8 : 12,
            left: variant === 'grid' ? 8 : 12,
            zIndex: 4,
            fontSize: variant === 'grid' ? 11 : 13,
            fontWeight: 800,
            letterSpacing: '0.1em',
            color: '#000',
            background: INK,
            borderRadius: 6,
            padding: '4px 9px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          {badge}
        </span>
      )}
      <GameArt
        game={game}
        variant="tile"
        hideMotif
        style={{ position: 'absolute', inset: 0, opacity: showShots ? 0 : 1, transition: 'opacity 500ms ease' }}
      >
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 10%' }}>
          <GameLogo
            title={game.title}
            theme={game.theme}
            style={{ fontSize: variant === 'lg' ? '15cqh' : '18cqh', maxWidth: '86%', whiteSpace: 'normal', textAlign: 'center', lineHeight: 1 }}
          />
        </div>
      </GameArt>

      {slideshow &&
        SHOT_VARIANTS.map((v, i) => (
          <Screenshot
            key={v}
            game={game}
            variant={v}
            style={{ position: 'absolute', inset: 0, opacity: showShots && i === shot ? 1 : 0, transition: 'opacity 700ms ease' }}
          />
        ))}

      {/* Legibility scrim + caption — only the featured (lg) tiles carry a
          caption, so the bottom fade is limited to them; regular (sm/grid)
          tiles show clean art with no player count. */}
      {variant === 'lg' && (
        <>
          <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0) 55%)' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 22 }}>
            <span style={{ display: 'flex', gap: 10, alignItems: 'center', color: INK_DIM, fontSize: 20 }}>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{game.players}</span>
              <span style={{ color: '#8a8a9a' }}>• {game.description}</span>
            </span>
          </div>
        </>
      )}

      {showShots && (
        <div
          style={{
            position: 'absolute', top: 14, left: 14, display: 'flex', alignItems: 'center', gap: 7,
            padding: '5px 10px', borderRadius: 9999, background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.28)',
            fontFamily: FONT, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: INK,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />
          {fakePlayingCount(game.id)} PLAYING
        </div>
      )}
    </div>
  );
}

function ShelfTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ padding: `0 ${SHELF_PAD}px`, marginBottom: 22 }}>
      <h2 style={{ margin: 0, fontSize: 32, fontWeight: 700, letterSpacing: '-0.01em', color: INK }}>{title}</h2>
      {sub && <p style={{ margin: '10px 0 0', fontSize: 21, color: '#8a8a9a' }}>{sub}</p>}
    </div>
  );
}

// ── Regular (small) game row ──────────────────────────────────────────────────
export function SmallGameRow() {
  const games = HUB_GAMES.slice(0, 5);
  return (
    <ScaledStage designW={1560} designH={330}>
      <div style={{ paddingTop: 28 }}>
        <ShelfTitle title="Party Starters" />
        <div style={{ display: 'flex', gap: TILE.sm.gap, paddingLeft: SHELF_PAD }}>
          {games.map((g, i) => (
            // Tiles can carry an optional "NEW" corner tag (used by the New on
            // Weekend row for freshly-added games).
            <KitTile key={g.id} game={g} variant="sm" focused={i === 1} badge={i === 0 ? 'NEW' : undefined} />
          ))}
        </div>
      </div>
    </ScaledStage>
  );
}

// ── Large game row (slideshow on focus) ───────────────────────────────────────
export function LargeGameRow() {
  const games = HUB_GAMES.slice(8, 11);
  return (
    <ScaledStage designW={1440} designH={470}>
      <div style={{ paddingTop: 28 }}>
        <ShelfTitle title="Games That Go Viral" sub="The games everyone’s talking about right now" />
        <div style={{ display: 'flex', gap: TILE.lg.gap, paddingLeft: SHELF_PAD }}>
          {games.map((g, i) => (
            <KitTile key={g.id} game={g} variant="lg" focused={i === 0} slideshow />
          ))}
        </div>
      </div>
    </ScaledStage>
  );
}

// ── All Games grid ────────────────────────────────────────────────────────────
export function GameGridKit() {
  const rows = [HUB_GAMES.slice(0, GRID_COLS), HUB_GAMES.slice(GRID_COLS, GRID_COLS * 2)];
  return (
    <ScaledStage designW={1920} designH={560}>
      <div style={{ paddingTop: 28 }}>
        <ShelfTitle title="All Games" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: TILE.grid.gap, padding: `0 ${SHELF_PAD}px` }}>
          {rows.map((r, ri) => (
            <div key={ri} style={{ display: 'flex', gap: TILE.grid.gap }}>
              {r.map((g, ci) => (
                <KitTile key={g.id} game={g} variant="grid" focused={ri === 0 && ci === 2} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </ScaledStage>
  );
}

// ── Promo banner ──────────────────────────────────────────────────────────────
export function PromoBanner() {
  return (
    <ScaledStage designW={1920} designH={240}>
      <div style={{ padding: `28px ${SHELF_PAD}px` }}>
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40,
            padding: '40px 56px', borderRadius: 24, color: INK, fontFamily: FONT,
            background: 'linear-gradient(100deg, #17181c 0%, #26272d 58%, #35363d 100%)', border: '1px solid #3a3b3f',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 1100 }}>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.14em', color: '#b9babe' }}>WEEKEND PREMIUM</span>
            <span style={{ fontSize: 46, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05 }}>Start your 7-day free trial</span>
            <span style={{ fontSize: 22, color: 'rgba(243,244,241,0.72)' }}>Unlimited access to every game. Cancel anytime.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22, flex: '0 0 auto' }}>
            <span style={{ fontSize: 18, fontWeight: 600, color: '#cfd0d3' }}>Scan to start →</span>
            <div style={{ background: '#fff', padding: 12, borderRadius: 14, lineHeight: 0 }}>
              <QRCodeSVG value="https://weekend.tv/free-trial" size={124} level="M" includeMargin={false} />
            </div>
          </div>
        </div>
      </div>
    </ScaledStage>
  );
}

// ── Song Quiz inline banner (the puzzle row) ──────────────────────────────────
// Mirrors GameHub's puzzle row in its "question" stage: a title + auto-scrolling
// lyric window on the left, a 2×2 answer grid on the right. Playable inline —
// the user answers the song-quiz question straight from the hub.
const SQ_BANNER = {
  label: 'SONG QUIZ',
  title: 'Guess who sings this song',
  lyrics: [
    'City lights are calling out my name tonight',
    'Dancing through the rain without a single care',
    'Hold me like the summer never has to end',
  ],
  options: ['The Midnight Echo', 'Nova Reign', 'Cassette Kids', 'Golden Hour'],
  focused: 2, // the tile shown with the focus ring
};

function IconMusic({ size = 28, color = INK }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 17V4.5l10-2V15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6.4" cy="17" r="2.6" fill={color} />
      <circle cx="16.4" cy="15" r="2.6" fill={color} />
    </svg>
  );
}

export function SongQuizBanner() {
  return (
    <ScaledStage designW={1920} designH={356}>
      <style>{'@keyframes kitNoteSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}</style>
      <div style={{ padding: `28px ${SHELF_PAD}px` }}>
        <div
          style={{
            width: '100%',
            minHeight: 300,
            borderRadius: 20,
            display: 'flex',
            alignItems: 'stretch',
            gap: 48,
            padding: '34px 48px',
            background: 'linear-gradient(100deg, #17181c 0%, #23242a 60%, #303138 100%)',
            border: '1px solid #3a3b3f',
            fontFamily: FONT,
            color: INK,
            overflow: 'hidden',
          }}
        >
          {/* Left: title + 3-line lyric window (center line solid, neighbors fade). */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 16 }}>
              <div
                style={{
                  flex: '0 0 auto', width: 58, height: 58, borderRadius: '50%',
                  border: '1px solid #3a3b3f', background: 'rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'kitNoteSpin 3.5s linear infinite',
                }}
              >
                <IconMusic size={28} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.16em', color: '#b9babe' }}>{SQ_BANNER.label}</span>
                <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>{SQ_BANNER.title}</span>
              </div>
            </div>
            <div style={{ height: 1, background: '#3a3b3f', marginBottom: 20 }} />
            <div style={{ height: 124, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {SQ_BANNER.lyrics.map((line, i) => {
                  const isCur = i === 1;
                  return (
                    <div
                      key={line}
                      style={{
                        fontSize: isCur ? 30 : 23,
                        fontWeight: isCur ? 800 : 500,
                        fontStyle: 'italic',
                        opacity: isCur ? 1 : 0.24,
                        lineHeight: 1.32,
                        letterSpacing: '-0.01em',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {line}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: 2×2 answer grid (one tile focused). */}
          <div style={{ flex: '0 0 auto', width: 820, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {SQ_BANNER.options.map((opt, i) => {
                const isFocus = i === SQ_BANNER.focused;
                return (
                  <div
                    key={opt}
                    style={{
                      minHeight: 78,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '20px 24px',
                      borderRadius: 14,
                      fontSize: 23,
                      fontWeight: 700,
                      letterSpacing: '-0.01em',
                      background: '#1c1d21',
                      color: INK,
                      border: '1px solid #3a3b3f',
                      boxShadow: isFocus ? '0 0 0 4px #fff' : 'none',
                      transform: isFocus ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </ScaledStage>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
export function HeroExample() {
  const game = HUB_GAMES[2]; // a light-brand game to show the onDark title handling
  const textCol: CSSProperties = {
    position: 'absolute', left: SHELF_PAD, bottom: 96, width: 900,
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 24,
  };
  return (
    <ScaledStage designW={1920} designH={620}>
      <div style={{ position: 'relative', width: 1920, height: 620 }}>
        <GameArt game={game} variant="hero" style={{ position: 'absolute', top: 0, left: 0, width: 1920, height: 560 }} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: `linear-gradient(to right, ${STAGE_BG} 0%, ${STAGE_BG} 24%, transparent 56%)` }} />
        <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 560, background: `linear-gradient(to top, ${STAGE_BG} 2%, transparent 46%)` }} />
        <div style={textCol}>
          <div style={{ maxWidth: 640 }}>
            <GameLogo title={game.title} theme={game.theme} onDark style={{ fontSize: 88, whiteSpace: 'normal' }} />
          </div>
          <p style={{ margin: 0, maxWidth: 620, fontSize: 26, lineHeight: 1.35, color: 'rgba(243,244,241,0.82)' }}>{game.description}</p>
          <GameMetaPills players={game.players} interaction={game.interaction} size={42} />
          <div
            style={{
              marginTop: 6, minWidth: 220, height: 56, padding: '0 34px', borderRadius: 9999,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FONT, fontSize: 20, fontWeight: 600, letterSpacing: '0.02em',
              background: INK, color: '#000', border: '1px solid #fff', boxShadow: '0 0 0 4px #fff, 0 12px 30px rgba(0,0,0,0.6)',
            }}
          >
            PLAY NOW
          </div>
        </div>
      </div>
    </ScaledStage>
  );
}
