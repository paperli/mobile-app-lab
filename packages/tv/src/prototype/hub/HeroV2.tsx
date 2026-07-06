// Hero v2 band — 1920×800, faithful to the arcade runbook spec.
//   - Right-weighted art (focal subject in right 60%), full-bleed here since
//     the gradient already resolves to the base color on the left seam.
//   - Left fade:   base 0%→26%, transparent 52% (to the right).
//   - Bottom fade: base 0%→14%, transparent 52% (to the top).
//   - Weekend brand mark @ x=80, y=45 (~218×68).
//   - Left content column @ x=80: game logo slot (≤520×200, bottom-anchored),
//     description (≤2 lines, ≤560 wide), metadata pills (~y600 baseline).
// Rendered in the 1920-px design space; the hub stage scales it to fit.
import type { HubGame } from './games';
import { GameArt } from './GameArt';
import { GameLogo } from './GameLogo';
import { GameMetaPills } from './MetadataPill';

const BAND_W = 1920;
const BAND_H = 800;

interface HeroV2Props {
  game: HubGame;
  /** Show the "Available now" ribbon (featured slot). */
  available?: boolean;
}

export function HeroV2({ game, available }: HeroV2Props) {
  const base = game.theme.base;

  return (
    <div style={{ position: 'relative', width: BAND_W, height: BAND_H, backgroundColor: base, overflow: 'hidden' }}>
      {/* Right-aligned brand art */}
      <GameArt game={game} variant="hero" style={{ position: 'absolute', inset: 0 }} />

      {/* Left fade — solid base to ~x500, then clears */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(to right, ${base} 0%, ${base} 26%, transparent 52%)`,
          pointerEvents: 'none',
        }}
      />
      {/* Bottom fade — grounds the band into the shelf below */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(to top, ${base} 0%, ${base} 14%, transparent 52%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Weekend brand mark */}
      <div
        style={{
          position: 'absolute',
          left: 80,
          top: 45,
          fontFamily: "'Weekend Repro', ui-sans-serif, system-ui, sans-serif",
          fontWeight: 800,
          fontSize: 46,
          letterSpacing: '-0.02em',
          color: 'rgb(255, 218, 10)', // canary-500
          lineHeight: 1,
        }}
      >
        weekend
      </div>

      {available && (
        <div
          style={{
            position: 'absolute',
            top: 52,
            right: -64,
            transform: 'rotate(38deg)',
            background: 'rgb(247, 33, 73)', // raspberry
            color: '#fff',
            fontFamily: "'Weekend Repro', ui-sans-serif, system-ui, sans-serif",
            fontWeight: 800,
            fontSize: 24,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '10px 90px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
          }}
        >
          Available now
        </div>
      )}

      {/* Left content column — bottom-anchored group */}
      <div
        style={{
          position: 'absolute',
          left: 80,
          bottom: 96,
          width: 620,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 28,
        }}
      >
        {/* Logo slot ≤520×200 */}
        <div style={{ maxWidth: 520, minHeight: 0 }}>
          <GameLogo title={game.title} theme={game.theme} style={{ fontSize: 88, whiteSpace: 'normal' }} />
        </div>

        {/* Description ≤2 lines, ≤560 wide */}
        <p
          style={{
            margin: 0,
            maxWidth: 560,
            fontFamily: "'Weekend Repro', ui-sans-serif, system-ui, sans-serif",
            fontSize: 28,
            lineHeight: 1.35,
            color: 'rgba(243, 244, 241, 0.82)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {game.description}
        </p>

        {/* Metadata pills */}
        <GameMetaPills players={game.players} interaction={game.interaction} size={44} />
      </div>
    </div>
  );
}

export { BAND_W as HERO_WIDTH, BAND_H as HERO_HEIGHT };
