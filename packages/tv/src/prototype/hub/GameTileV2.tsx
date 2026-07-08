// Game tile — 16:9, 6px corner radius, "the game's logotype on brand art"
// (runbook game-tile spec: 387×219 render). Fills its parent's width and keeps
// the aspect ratio, so the hub row controls sizing. The logotype scales in
// container units so it reads at any tile size.
import type { CSSProperties } from 'react';
import type { HubGame } from './games';
import { GameArt } from './GameArt';
import { GameLogo } from './GameLogo';

interface GameTileV2Props {
  game: HubGame;
  /** Dim unfocused tiles (hub controls focus emphasis). */
  dim?: boolean;
  /** Press-scale feedback. */
  pressing?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}

export function GameTileV2({ game, dim, pressing, onClick, style }: GameTileV2Props) {
  return (
    <button
      onClick={onClick}
      style={{
        appearance: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        width: '100%',
        aspectRatio: '16 / 9',
        borderRadius: 6,
        overflow: 'hidden',
        display: 'block',
        opacity: dim ? 0.72 : 1,
        transform: pressing ? 'scale(0.95)' : 'scale(1)',
        transition: pressing
          ? 'transform 150ms ease-out'
          : 'transform 300ms ease-out, opacity 300ms ease-out',
        ...style,
      }}
    >
      <GameArt game={game} variant="tile" style={{ width: '100%', height: '100%' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '0 8%',
          }}
        >
          <GameLogo
            title={game.title}
            theme={game.theme}
            style={{
              fontSize: '19cqh',
              maxWidth: '68%',
              whiteSpace: 'normal',
              textAlign: 'left',
            }}
          />
        </div>
      </GameArt>
    </button>
  );
}
