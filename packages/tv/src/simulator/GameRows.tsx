// Renders the engine's categorized rows as a TV-style hub using the hub
// prototype's generated-art tiles. Hovering a tile:
//   • overlays per-player-count "play" buttons (drives the play simulation)
//   • shows a score-breakdown popover positioned `fixed` so it overlaps other
//     content instead of being clipped by the row's horizontal scroll.

import { useRef, useState } from 'react';
import type { Game, HubResult, Recommendation, Row } from '../personalization';
import { GameTileV2 } from '../prototype/hub/GameTileV2';
import { FONT, GENRE_COLOR, SCOPE_COLOR, UI } from './theme';

type PlayFn = (game: Game, playerCount: number) => void;

// Persisted row-order preference. Recently Played is the default highest
// priority; the rest follow party-then-general. Users can reorder and it's
// saved to localStorage.
export const ROW_ORDER_KEY = 'weekend-sim-row-order';
export const DEFAULT_ORDER = [
  'recently_played',
  'keep_party_going',
  'more_for_n',
  'because_you_played',
  'genre_continuation',
  'try_a_team_game',
  'recommended_for_you',
  'new_this_week',
  'trending',
  'hidden_gems',
];

export function loadRowOrder(): string[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(ROW_ORDER_KEY) : null;
    const saved = raw ? (JSON.parse(raw) as string[]) : [];
    const merged = saved.filter((s) => DEFAULT_ORDER.includes(s));
    for (const s of DEFAULT_ORDER) if (!merged.includes(s)) merged.push(s);
    return merged;
  } catch {
    return [...DEFAULT_ORDER];
  }
}

export function HubRows({
  hub,
  onPlay,
  order,
  onOrderChange,
}: {
  hub: HubResult;
  onPlay: PlayFn;
  order: string[];
  onOrderChange: (next: string[]) => void;
}) {
  if (hub.rows.length === 0) {
    return (
      <div style={{ padding: '40px 0', color: UI.muted, fontSize: 14 }}>
        No rows generated — try generating a profile or increasing the library size.
      </div>
    );
  }

  const ordered = [...hub.rows].sort((a, b) => order.indexOf(a.strategy) - order.indexOf(b.strategy));

  const move = (strategy: string, dir: -1 | 1) => {
    const displayed = ordered.map((r) => r.strategy as string);
    const target = displayed[displayed.indexOf(strategy) + dir];
    if (!target) return;
    const next = [...order];
    const a = next.indexOf(strategy);
    const b = next.indexOf(target);
    [next[a], next[b]] = [next[b], next[a]];
    onOrderChange(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
      {ordered.map((row, i) => (
        <Shelf
          key={row.id}
          row={row}
          onPlay={onPlay}
          canUp={i > 0}
          canDown={i < ordered.length - 1}
          onUp={() => move(row.strategy, -1)}
          onDown={() => move(row.strategy, 1)}
        />
      ))}
    </div>
  );
}

function Shelf({
  row,
  onPlay,
  canUp,
  canDown,
  onUp,
  onDown,
}: {
  row: Row;
  onPlay: PlayFn;
  canUp: boolean;
  canDown: boolean;
  onUp: () => void;
  onDown: () => void;
}) {
  const scopeColor = SCOPE_COLOR[row.scope] ?? UI.muted;
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', gap: 4 }}>
          <MoveBtn dir="up" disabled={!canUp} onClick={onUp} />
          <MoveBtn dir="down" disabled={!canDown} onClick={onDown} />
        </span>
        <h3 style={{ margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: '-0.01em', color: UI.ink }}>{row.title}</h3>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: scopeColor,
            background: `${scopeColor}1f`,
            border: `1px solid ${scopeColor}55`,
            borderRadius: 999,
            padding: '3px 9px',
          }}
        >
          {row.scope}
        </span>
        <span style={{ fontSize: 13, color: UI.muted }}>{row.subtitle}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12.5, color: UI.ink50 }}>{row.items.length} games</span>
      </div>
      <div
        style={{
          marginTop: 14,
          display: 'flex',
          gap: 16,
          overflowX: 'auto',
          paddingBottom: 12,
          scrollbarWidth: 'thin',
        }}
      >
        {row.items.map((item) => (
          <Tile key={item.game.id} item={item} onPlay={onPlay} />
        ))}
      </div>
    </section>
  );
}

function MoveBtn({ dir, disabled, onClick }: { dir: 'up' | 'down'; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={dir === 'up' ? 'Move row up' : 'Move row down'}
      aria-label={dir === 'up' ? 'Move row up' : 'Move row down'}
      style={{
        width: 26,
        height: 26,
        display: 'grid',
        placeItems: 'center',
        padding: 0,
        borderRadius: 8,
        border: `1px solid ${UI.border}`,
        background: UI.cardAlt,
        color: disabled ? UI.border : UI.ink70,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {dir === 'up' ? <polyline points="6 15 12 9 18 15" /> : <polyline points="6 9 12 15 18 9" />}
      </svg>
    </button>
  );
}

const TILE_W = 232;

// Responsive full-catalog grid, ranked by the engine. Reuses the same tile as
// the rows (score meter, hover-to-play, "why this pick?" breakdown), so the
// grid visibly reorders as the profile / party context changes.
export function GameGrid({ items, onPlay }: { items: Recommendation[]; onPlay: PlayFn }) {
  if (items.length === 0) {
    return (
      <div style={{ padding: '40px 0', color: UI.muted, fontSize: 14 }}>
        No games in the current library — increase the library size.
      </div>
    );
  }
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${TILE_W}px, 1fr))`,
        gap: 20,
      }}
    >
      {items.map((item, i) => (
        <Tile key={item.game.id} item={item} onPlay={onPlay} fill rank={i + 1} />
      ))}
    </div>
  );
}

function Tile({ item, onPlay, fill, rank }: { item: Recommendation; onPlay: PlayFn; fill?: boolean; rank?: number }) {
  const [hover, setHover] = useState(false);
  const [info, setInfo] = useState(false);
  const [infoRect, setInfoRect] = useState<DOMRect | null>(null);
  const infoRef = useRef<HTMLButtonElement>(null);
  const { game, reason, score } = item;

  const openInfo = () => {
    setInfo(true);
    if (infoRef.current) setInfoRect(infoRef.current.getBoundingClientRect());
  };

  // Valid active-player counts to offer (cap the button count for tidy tiles).
  const maxBtn = Math.min(game.maxPlayers, 8);
  const counts: number[] = [];
  for (let n = game.minPlayers; n <= maxBtn; n++) counts.push(n);
  const defaultCount = game.minPlayers <= 1 ? 1 : game.minPlayers;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setInfo(false);
      }}
      style={{ position: 'relative', flex: fill ? undefined : '0 0 auto', width: fill ? '100%' : TILE_W }}
    >
      {/* Art tile (hub generated art) */}
      <div style={{ position: 'relative', borderRadius: 6, overflow: 'hidden' }}>
        <GameTileV2 game={game.hub} onClick={() => onPlay(game, defaultCount)} />

        {game.lifecycle === 'New' && (
          <span
            style={{
              position: 'absolute',
              top: 7,
              left: 7,
              fontSize: 9.5,
              fontWeight: 800,
              letterSpacing: '0.06em',
              color: '#04241a',
              background: '#34d399',
              borderRadius: 5,
              padding: '2px 6px',
              pointerEvents: 'none',
            }}
          >
            NEW
          </span>
        )}

        {/* Info button — appears on tile hover; hover it to reveal the breakdown */}
        {hover && (
          <button
            ref={infoRef}
            onMouseEnter={openInfo}
            onMouseLeave={() => setInfo(false)}
            onClick={(e) => e.stopPropagation()}
            title="Why this pick?"
            aria-label="Why this pick?"
            style={{
              position: 'absolute',
              top: 7,
              right: 7,
              zIndex: 6,
              display: 'grid',
              placeItems: 'center',
              width: 26,
              height: 26,
              padding: 0,
              borderRadius: 999,
              border: `1px solid ${info ? game.accent : 'rgba(255,255,255,0.5)'}`,
              background: info ? game.accent : 'rgba(0,0,0,0.6)',
              color: info ? '#04140f' : '#fff',
              cursor: 'pointer',
            }}
          >
            <InfoIcon />
          </button>
        )}

        {/* hover: play-with-N buttons */}
        {hover && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: 8,
              gap: 6,
              background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0) 100%)',
              pointerEvents: 'none',
            }}
          >
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.82)', letterSpacing: '0.02em' }}>
              ▶ Play with…
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, pointerEvents: 'auto' }}>
              {counts.map((n) => (
                <button
                  key={n}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlay(game, n);
                  }}
                  title={`Play with ${n} player${n > 1 ? 's' : ''}`}
                  style={{
                    fontFamily: FONT,
                    fontSize: 12.5,
                    fontWeight: 800,
                    minWidth: 26,
                    height: 26,
                    padding: '0 7px',
                    borderRadius: 7,
                    border: `1px solid ${game.accent}`,
                    background: 'rgba(0,0,0,0.55)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = game.accent;
                    e.currentTarget.style.color = '#04140f';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0,0,0,0.55)';
                    e.currentTarget.style.color = '#fff';
                  }}
                >
                  {n}
                </button>
              ))}
              {game.maxPlayers > 8 && (
                <span style={{ alignSelf: 'center', fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>+{game.maxPlayers}</span>
              )}
            </div>
          </div>
        )}

        {/* score meter */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, background: 'rgba(0,0,0,0.35)', pointerEvents: 'none' }}>
          <div style={{ height: '100%', width: `${Math.round(score * 100)}%`, background: game.accent }} />
        </div>
      </div>

      {/* Meta */}
      <div style={{ marginTop: 9 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {rank != null && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: UI.ink70,
                background: UI.cardAlt,
                border: `1px solid ${UI.border}`,
                borderRadius: 6,
                padding: '1px 6px',
                flex: '0 0 auto',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              #{rank}
            </span>
          )}
          <span style={{ width: 8, height: 8, borderRadius: 2, background: GENRE_COLOR[game.genre], flex: '0 0 auto' }} />
          <span
            style={{
              fontSize: 13.5,
              fontWeight: 700,
              color: UI.ink,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {game.title}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: UI.muted, fontVariantNumeric: 'tabular-nums' }}>
            {score.toFixed(2)}
          </span>
        </div>
        <div style={{ marginTop: 4, fontSize: 11.5, lineHeight: 1.35, color: UI.ink50, height: 31, overflow: 'hidden' }}>
          {reason.message}
        </div>
      </div>

      {info && infoRect && <Breakdown item={item} rect={infoRect} />}
    </div>
  );
}

function InfoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16" />
      <line x1="12" y1="7.6" x2="12" y2="7.7" />
    </svg>
  );
}

// Fixed-position popover — escapes the row's overflow clip and overlaps content.
// Right-aligned to the info button (which sits at the tile's top-right).
function Breakdown({ item, rect }: { item: Recommendation; rect: DOMRect }) {
  const { reason, components } = item;
  const scopeColor = SCOPE_COLOR[reason.scope] ?? UI.muted;
  const maxAbs = Math.max(0.001, ...components.map((c) => Math.abs(c.value)));

  const width = 262;
  const estHeight = 92 + components.length * 16;
  let left = rect.right - width;
  left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
  let top = rect.bottom + 8;
  if (top + estHeight > window.innerHeight - 8) top = Math.max(8, rect.top - estHeight - 8);

  return (
    <div
      style={{
        position: 'fixed',
        top,
        left,
        zIndex: 1000,
        width,
        background: '#0a0b0d',
        border: `1px solid ${UI.borderStrong}`,
        borderRadius: 12,
        padding: '12px 13px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.75)',
        fontFamily: FONT,
        pointerEvents: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: 9.5,
            fontWeight: 800,
            letterSpacing: '0.06em',
            color: scopeColor,
            background: `${scopeColor}1f`,
            borderRadius: 5,
            padding: '2px 6px',
          }}
        >
          {reason.code}
        </span>
        <span style={{ fontSize: 11.5, color: UI.muted }}>conf {reason.confidence.toFixed(2)}</span>
      </div>
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {components.map((c) => {
          const pos = c.value >= 0;
          return (
            <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10.5, color: UI.ink70, width: 122, flex: '0 0 auto' }}>{c.label}</span>
              <div style={{ position: 'relative', flex: 1, height: 7, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                <div
                  style={{
                    position: 'absolute',
                    height: '100%',
                    borderRadius: 4,
                    width: `${(Math.abs(c.value) / maxAbs) * 100}%`,
                    background: pos ? UI.good : UI.bad,
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 10,
                  color: pos ? UI.good : UI.bad,
                  width: 34,
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                  flex: '0 0 auto',
                }}
              >
                {c.value >= 0 ? '+' : ''}
                {c.value.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${UI.border}`, fontSize: 11.5, color: UI.ink }}>
        Final score <b style={{ color: item.game.accent }}>{item.score.toFixed(3)}</b>
      </div>
    </div>
  );
}
