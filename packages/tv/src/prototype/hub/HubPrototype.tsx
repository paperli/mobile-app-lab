// Hub layout prototype — assembles the reusable pieces into a navigable TV
// hub rendered in a fixed 1920×1080 design space that scales to fit.
//
//   Hub mode:  Hero v2 band (focused game) + a scrolling tile shelf with a
//              focus frame. ← / → browse, Enter opens the game.
//   Detail:    Hero v2 + the game's three screenshots. Esc / Backspace back.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { HUB_GAMES } from './games';
import { HeroV2 } from './HeroV2';
import { GameTileV2 } from './GameTileV2';
import { Screenshot, SHOT_VARIANTS } from './Screenshot';

const STAGE_W = 1920;
const STAGE_H = 1080;

// Tile shelf geometry (design-space px)
const SHELF_PAD = 80;
const TILE_W = 340;
const TILE_H = (TILE_W * 9) / 16;
const GAP = 28;
const STEP = TILE_W + GAP;
const VISIBLE = 5; // tiles before the row starts scrolling

const SHOT_LABELS: Record<string, string> = {
  gameplay: 'Gameplay',
  scoreboard: 'Leaderboard',
  results: 'Results',
};

/** Scale a fixed 1920×1080 stage to the available width. */
function useFitScale() {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / STAGE_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, scale };
}

export function HubPrototype() {
  const { ref, scale } = useFitScale();
  const [focused, setFocused] = useState(0);
  const [mode, setMode] = useState<'hub' | 'detail'>('hub');
  const [pressing, setPressing] = useState(false);

  const game = HUB_GAMES[focused];

  const open = useCallback(() => {
    setPressing(true);
    setTimeout(() => setPressing(false), 150);
    setTimeout(() => setMode('detail'), 150);
  }, []);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (mode === 'detail') {
        if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'ArrowLeft') {
          e.preventDefault();
          setMode('hub');
        }
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFocused((i) => Math.min(i + 1, HUB_GAMES.length - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocused((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    },
    [mode, open]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const rowOffset = focused >= VISIBLE ? -(focused - (VISIBLE - 1)) * STEP : 0;

  return (
    <div>
      {/* Instructions */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="text-sm text-fg-muted">
          {mode === 'hub'
            ? '← / → browse · Enter / click opens the game'
            : 'Esc / Backspace / ← returns to the hub'}
        </span>
        <span className="text-sm text-fg-muted">· {HUB_GAMES.length} games · {game.title}</span>
      </div>

      {/* Fit wrapper — reserves scaled height */}
      <div ref={ref} style={{ width: '100%', height: STAGE_H * scale, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: STAGE_W,
            height: STAGE_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            background: game.theme.base,
            overflow: 'hidden',
            borderRadius: 16 / scale, // keep visual radius ~16px after scale
          }}
        >
          {/* Hero band */}
          <HeroV2 game={game} available={mode === 'hub' && focused === 0} />

          {mode === 'hub' ? (
            <>
              {/* Section label */}
              <div
                style={{
                  position: 'absolute',
                  top: 812,
                  left: SHELF_PAD,
                  fontFamily: "'Weekend Repro', ui-sans-serif, system-ui, sans-serif",
                  fontWeight: 700,
                  fontSize: 28,
                  color: '#F3F4F1',
                }}
              >
                All games
              </div>

              {/* Tile shelf */}
              <div style={{ position: 'absolute', top: 862, left: 0, right: 0, height: TILE_H + 20, overflow: 'hidden' }}>
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: SHELF_PAD,
                    display: 'flex',
                    gap: GAP,
                    transform: `translateX(${rowOffset}px)`,
                    transition: 'transform 300ms ease-out',
                  }}
                >
                  {HUB_GAMES.map((g, i) => (
                    <div key={g.id} style={{ width: TILE_W, flex: '0 0 auto' }}>
                      <GameTileV2
                        game={g}
                        dim={i !== focused}
                        pressing={pressing && i === focused}
                        onClick={() => (i === focused ? open() : setFocused(i))}
                      />
                    </div>
                  ))}

                  {/* Focus frame rides with the row */}
                  <div
                    aria-hidden
                    style={{
                      position: 'absolute',
                      top: -6,
                      left: focused * STEP - 6,
                      width: TILE_W + 12,
                      height: TILE_H + 12,
                      border: '4px solid rgb(255, 218, 10)',
                      borderRadius: 12,
                      boxShadow: '0 0 24px rgba(255, 218, 10, 0.5)',
                      transition: 'left 300ms ease-out',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            /* Detail — screenshots row */
            <div style={{ position: 'absolute', top: 812, left: SHELF_PAD, right: SHELF_PAD }}>
              <div
                style={{
                  fontFamily: "'Weekend Repro', ui-sans-serif, system-ui, sans-serif",
                  fontWeight: 700,
                  fontSize: 28,
                  color: '#F3F4F1',
                  marginBottom: 16,
                }}
              >
                Screenshots
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 28 }}>
                {SHOT_VARIANTS.map((v) => (
                  <div key={v}>
                    <Screenshot game={game} variant={v} />
                    <div
                      style={{
                        marginTop: 12,
                        fontFamily: "'Weekend Repro', ui-sans-serif, system-ui, sans-serif",
                        fontSize: 22,
                        color: 'rgba(243,244,241,0.7)',
                      }}
                    >
                      {SHOT_LABELS[v]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
