import { PLACEHOLDER_GAMES, GameData, NavigationDirection } from '@mobile-app-lab/shared';
import { QRCodeSVG } from 'qrcode.react';
import { GameTile } from './GameTile';
import { GamePreview } from './GamePreview';
import { FocusFrame } from './FocusFrame';
import { getMobileUrl } from '../utils/getMobileUrl';

interface GameHubProps {
  roomCode: string;
  focusedIndex: number;
  bounceDirection: NavigationDirection | null;
  isPressing: boolean;
  onFocusChange: (index: number) => void;
}

// Tile layout constants — shared with FocusFrame (keep in sync).
const TILE_WIDTH = 20; // vw
const TILE_GAP = 2; // vw
const TILE_HEIGHT = (TILE_WIDTH * 9) / 16;
const VISIBLE_COUNT = 4; // tiles visible before the row starts scrolling
const VISIBLE_BLOCK_WIDTH = TILE_WIDTH * VISIBLE_COUNT + TILE_GAP * (VISIBLE_COUNT - 1);
const FIRST_TILE_OFFSET = (100 - VISIBLE_BLOCK_WIDTH) / 2; // centers the visible block

export function GameHub({ roomCode, focusedIndex, bounceDirection, isPressing, onFocusChange }: GameHubProps) {
  const games = PLACEHOLDER_GAMES as unknown as GameData[];
  const mobileBaseUrl = getMobileUrl();
  const mobileUrl = `${mobileBaseUrl}?code=${roomCode}`;

  // Shift the row left when the focused tile would otherwise fall outside the visible block.
  const rowOffset =
    focusedIndex >= VISIBLE_COUNT
      ? -(focusedIndex - (VISIBLE_COUNT - 1)) * (TILE_WIDTH + TILE_GAP)
      : 0;

  return (
    <div className="relative w-full h-full">
      {/* Background Preview */}
      <GamePreview game={games[focusedIndex]} />

      {/* Connection Status Indicator with QR Code */}
      <div className="absolute top-[2vh] right-[2vw] bg-black/60 backdrop-blur-md rounded-2xl px-[2vw] py-[1.5vh] text-white">
        <div className="flex items-start gap-[1.5vw]">
          {/* QR Code */}
          <div className="bg-white p-[0.5vw] rounded-lg">
            <QRCodeSVG
              value={mobileUrl}
              size={Math.min(window.innerWidth * 0.08, 120)}
              level="M"
              includeMargin={false}
            />
          </div>

          {/* Pairing Info */}
          <div className="flex-1">
            <div className="text-[0.8vw] font-semibold text-gray-300 mb-1">Pairing Code</div>
            <div className="text-[2.6vw] font-bold tracking-wider">{roomCode || 'LOADING'}</div>
            <div className="text-[0.7vw] text-gray-400 mt-2">
              Scan QR code or enter code on mobile
            </div>
          </div>
        </div>
      </div>

      {/* Game Tiles at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pt-[8vh] pb-[4vh] overflow-hidden">
        <div
          style={{
            position: 'relative',
            height: `${TILE_HEIGHT}vw`,
          }}
        >
          {/* Translated row — tiles and focus frame ride together so alignment is automatic */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: `${FIRST_TILE_OFFSET}vw`,
              display: 'flex',
              gap: `${TILE_GAP}vw`,
              transform: `translateX(${rowOffset}vw)`,
              transition: 'transform 300ms ease-out',
            }}
          >
            {games.map((game, index) => (
              <GameTile
                key={game.id}
                game={game}
                isPressing={isPressing && index === focusedIndex}
                onClick={() => onFocusChange(index)}
              />
            ))}
            <FocusFrame
              focusedIndex={focusedIndex}
              bounceDirection={bounceDirection}
              isPressing={isPressing}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
