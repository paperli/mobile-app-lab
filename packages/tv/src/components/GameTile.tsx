import { GameData } from '@mobile-app-lab/shared';

interface GameTileProps {
  game: GameData;
  isPressing: boolean;
  onClick?: () => void;
}

export function GameTile({ game, isPressing, onClick }: GameTileProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative w-[20vw] aspect-[16/9] rounded-[6px] overflow-hidden opacity-80
        ${isPressing ? 'transition-transform duration-150 ease-out' : 'transition-all duration-300 ease-out'}
      `}
      style={{
        backgroundColor: game.backgroundColor,
        transform: isPressing ? 'scale(0.95)' : 'scale(1)',
      }}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center p-[1.5vw]">
        <div className="text-[4vw] mb-[1vw]">🎮</div>
        <h3 className="text-[1.5vw] font-bold text-white text-center drop-shadow-lg">
          {game.title}
        </h3>
      </div>
    </button>
  );
}
