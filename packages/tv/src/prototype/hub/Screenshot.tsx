// Mock in-game screenshots — three themed 16:9 frames per game so the detail
// view has "screenshots" without real captures. Each frame is templated and
// re-skinned from the game's theme. All sizing is in container-query width
// units so a frame scales cleanly from thumbnail to full width.
import type { CSSProperties } from 'react';
import type { HubGame } from './games';
import { plainBackground, hexToRgba } from './artStyles';

export type ShotVariant = 'gameplay' | 'scoreboard' | 'results';
export const SHOT_VARIANTS: ShotVariant[] = ['gameplay', 'scoreboard', 'results'];

const FONT = "'Weekend Repro', ui-sans-serif, system-ui, sans-serif";

const PLAYERS = [
  { name: 'Ava', color: '#22d3ee', score: 4200 },
  { name: 'Max', color: '#f472b6', score: 3600 },
  { name: 'Zoe', color: '#fbbf24', score: 2800 },
  { name: 'Leo', color: '#34d399', score: 1900 },
];

function frameStyle(game: HubGame): CSSProperties {
  return {
    position: 'relative',
    width: '100%',
    aspectRatio: '16 / 9',
    borderRadius: 8,
    overflow: 'hidden',
    containerType: 'size',
    color: game.theme.light ? game.theme.ink ?? '#141414' : '#F3F4F1',
    fontFamily: FONT,
    ...plainBackground(game.theme),
  };
}

function TopBar({ game, right }: { game: HubGame; right: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '5cqw',
        left: '5cqw',
        right: '5cqw',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span style={{ fontWeight: 800, fontSize: '2.6cqw', color: game.theme.accent, letterSpacing: '-0.02em' }}>
        {game.title}
      </span>
      <span
        style={{
          fontSize: '2.4cqw',
          fontWeight: 700,
          padding: '1cqw 2.4cqw',
          borderRadius: 9999,
          background: 'rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        {right}
      </span>
    </div>
  );
}

function Gameplay({ game }: { game: HubGame }) {
  const a = game.theme.accent;
  const options = ['A', 'B', 'C', 'D'];
  return (
    <div style={frameStyle(game)}>
      <TopBar game={game} right="⏱ 0:12" />
      {/* Prompt card */}
      <div
        style={{
          position: 'absolute',
          top: '20cqw',
          left: '10cqw',
          right: '10cqw',
          padding: '3.5cqw',
          borderRadius: '2.5cqw',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.14)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2cqw', opacity: 0.7, marginBottom: '1.4cqw' }}>Round 3 of 10</div>
        <div style={{ fontSize: '3.4cqw', fontWeight: 700, lineHeight: 1.15 }}>Which one is the correct answer?</div>
      </div>
      {/* Answer options 2×2 */}
      <div
        style={{
          position: 'absolute',
          bottom: '5cqw',
          left: '10cqw',
          right: '10cqw',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2.2cqw',
        }}
      >
        {options.map((o, i) => {
          const active = i === 1;
          return (
            <div
              key={o}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2cqw',
                padding: '2.4cqw 2.8cqw',
                borderRadius: '1.8cqw',
                background: active ? hexToRgba(a, 0.9) : 'rgba(0,0,0,0.3)',
                border: `1px solid ${active ? a : 'rgba(255,255,255,0.14)'}`,
                color: active ? '#0a0a12' : 'inherit',
                fontWeight: 700,
              }}
            >
              <span
                style={{
                  width: '4.6cqw',
                  height: '4.6cqw',
                  borderRadius: 9999,
                  display: 'grid',
                  placeItems: 'center',
                  background: active ? '#0a0a12' : hexToRgba(a, 0.85),
                  color: active ? a : '#0a0a12',
                  fontSize: '2.4cqw',
                  flex: '0 0 auto',
                }}
              >
                {o}
              </span>
              <span style={{ height: '2.4cqw', flex: 1, borderRadius: 9999, background: active ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.22)' }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Scoreboard({ game }: { game: HubGame }) {
  const a = game.theme.accent;
  const max = PLAYERS[0].score;
  return (
    <div style={frameStyle(game)}>
      <TopBar game={game} right="Leaderboard" />
      <div
        style={{
          position: 'absolute',
          top: '16cqw',
          left: '8cqw',
          right: '8cqw',
          display: 'flex',
          flexDirection: 'column',
          gap: '2.4cqw',
        }}
      >
        {PLAYERS.map((p, i) => (
          <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '2.4cqw' }}>
            <span style={{ width: '3.5cqw', fontSize: '3cqw', fontWeight: 800, opacity: 0.7, textAlign: 'right' }}>{i + 1}</span>
            <span style={{ width: '5cqw', height: '5cqw', borderRadius: 9999, background: p.color, flex: '0 0 auto' }} />
            <span style={{ width: '14cqw', fontSize: '2.8cqw', fontWeight: 700 }}>{p.name}</span>
            <span style={{ flex: 1, height: '3.4cqw', borderRadius: 9999, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
              <span
                style={{
                  display: 'block',
                  height: '100%',
                  width: `${Math.round((p.score / max) * 100)}%`,
                  background: i === 0 ? a : hexToRgba(a, 0.55),
                  borderRadius: 9999,
                }}
              />
            </span>
            <span style={{ width: '9cqw', fontSize: '2.6cqw', fontWeight: 800, textAlign: 'right', color: i === 0 ? a : 'inherit' }}>
              {p.score.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Results({ game }: { game: HubGame }) {
  const a = game.theme.accent;
  const winner = PLAYERS[0];
  return (
    <div style={frameStyle(game)}>
      {/* confetti flecks */}
      {[
        [14, 20],
        [82, 24],
        [30, 70],
        [70, 66],
        [50, 14],
        [90, 50],
      ].map(([x, y], i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            width: '1.6cqw',
            height: '1.6cqw',
            borderRadius: i % 2 ? 9999 : 2,
            background: i % 2 ? a : '#F3F4F1',
            opacity: 0.8,
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.6cqw',
        }}
      >
        <div style={{ fontSize: '12cqw', lineHeight: 1, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.4))' }}>🏆</div>
        <div style={{ fontSize: '3cqw', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: a }}>Winner</div>
        <div style={{ fontSize: '5.5cqw', fontWeight: 900 }}>{winner.name}</div>
        <div
          style={{
            marginTop: '1.2cqw',
            fontSize: '2.6cqw',
            fontWeight: 700,
            padding: '1.6cqw 4cqw',
            borderRadius: 9999,
            background: a,
            color: '#0a0a12',
          }}
        >
          Play again
        </div>
      </div>
    </div>
  );
}

interface ScreenshotProps {
  game: HubGame;
  variant: ShotVariant;
  style?: CSSProperties;
  /** A real 16:9 capture (game.art.shots) — rendered instead of the mock frame. */
  src?: string;
}

export function Screenshot({ game, variant, style, src }: ScreenshotProps) {
  const inner = src ? (
    <img
      src={src}
      alt=""
      style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
    />
  ) : variant === 'gameplay' ? (
    <Gameplay game={game} />
  ) : variant === 'scoreboard' ? (
    <Scoreboard game={game} />
  ) : (
    <Results game={game} />
  );
  return style ? <div style={style}>{inner}</div> : inner;
}

/**
 * One entry per screenshot in a game's carousel: a real capture when the game has
 * exported art, otherwise the three mock frames templated from its theme (so
 * every title has "screenshots" whether or not it has been captured yet).
 */
export interface GameShot {
  key: string;
  /** Real capture URL; absent for the mock frames. */
  src?: string;
  /** Which mock frame to render when `src` is absent. */
  variant: ShotVariant;
}

export function gameShots(game: HubGame): GameShot[] {
  const real = game.art?.shots;
  if (real?.length) return real.map((src, i) => ({ key: `shot-${i}`, src, variant: SHOT_VARIANTS[i % SHOT_VARIANTS.length] }));
  return SHOT_VARIANTS.map((variant) => ({ key: variant, variant }));
}

/** How many screenshots a game's carousel has (real captures, else the mocks). */
export const shotCount = (game: HubGame | null | undefined): number =>
  game?.art?.shots?.length || SHOT_VARIANTS.length;
