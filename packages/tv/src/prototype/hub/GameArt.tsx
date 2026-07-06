// Procedural "art" surface for a game — the stand-in for a raster hero/tile
// image. Renders the themed background (gradient + pattern) plus a motif glyph
// as the focal subject, kept in the right 60% per the hero-v2 runbook rule.
import type { CSSProperties, ReactNode } from 'react';
import type { HubGame } from './games';
import { heroBackground, tileBackground, plainBackground, hexToRgba } from './artStyles';

type Variant = 'hero' | 'tile' | 'plain';

interface GameArtProps {
  game: HubGame;
  variant?: Variant;
  /** Overlaid content (logo slot, chrome, etc.). */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Hide the motif glyph (e.g. screenshots supply their own scene). */
  hideMotif?: boolean;
}

export function GameArt({ game, variant = 'tile', children, className, style, hideMotif }: GameArtProps) {
  const { theme } = game;
  const bg =
    variant === 'hero' ? heroBackground(theme) : variant === 'plain' ? plainBackground(theme) : tileBackground(theme);

  // Focal glyph sits in the right portion; larger + brighter on heroes.
  // Sized in container-query height units so one component scales from the
  // 219px tile to the 800px hero band without per-call tuning.
  const motif: CSSProperties =
    variant === 'hero'
      ? { right: '9%', top: '50%', transform: 'translateY(-50%) rotate(-8deg)', fontSize: '40cqh', opacity: 0.95 }
      : { right: '7%', bottom: '6%', transform: 'rotate(-8deg)', fontSize: '48cqh', opacity: 0.9 };

  return (
    <div
      className={className}
      style={{ position: 'relative', overflow: 'hidden', containerType: 'size', ...bg, ...style }}
    >
      {!hideMotif && (
        <>
          {/* soft glow behind the motif for depth */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              ...(variant === 'hero'
                ? { right: '4%', top: '50%', width: '38%', height: '80%', transform: 'translateY(-50%)' }
                : { right: '2%', bottom: '2%', width: '46%', height: '70%' }),
              background: `radial-gradient(circle, ${hexToRgba(theme.accent, 0.35)} 0%, transparent 70%)`,
              filter: 'blur(8px)',
              pointerEvents: 'none',
            }}
          />
          <div
            aria-hidden
            style={{
              position: 'absolute',
              filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.45))',
              pointerEvents: 'none',
              lineHeight: 1,
              ...motif,
            }}
          >
            {theme.motif}
          </div>
        </>
      )}
      {children}
    </div>
  );
}
