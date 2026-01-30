import { GameData } from '@mobile-app-lab/shared';

interface GamePreviewProps {
  game: GameData;
}

export function GamePreview({ game }: GamePreviewProps) {
  return (
    <div
      className="absolute inset-0 transition-all duration-500 ease-out"
      style={{
        background: `linear-gradient(135deg, ${game.backgroundColor}dd 0%, ${game.backgroundColor}88 50%, #1a1a2e 100%)`,
      }}
    >
      <div className="absolute inset-0 backdrop-blur-sm">
        <div className="flex items-center justify-center h-full">
          <div className="text-center px-[4vw] py-[3vh]">
            <div className="text-[8vw] mb-[2vh]">🎮</div>
            <h1 className="text-[4.5vw] font-bold text-white mb-[2vh] drop-shadow-2xl">
              {game.title}
            </h1>
            <p className="text-[2vw] text-white/80 drop-shadow-lg">{game.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
