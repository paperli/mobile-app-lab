import { NavigationDirection } from '@mobile-app-lab/shared';
import { GameMenuItem } from './GameMenuItem';
import { GameMenuFocusFrame } from './GameMenuFocusFrame';

const MENU_ITEMS = ['Single Player', 'Party Mode'] as const;

interface GameMenuProps {
  focusedIndex: number;
  bounceDirection: NavigationDirection | null;
  isPressing: boolean;
}

export function GameMenu({ focusedIndex, bounceDirection, isPressing }: GameMenuProps) {
  return (
    <div
      className="relative w-full h-full"
      style={{
        background: 'linear-gradient(108deg, #1C0C36 0%, #230F43 63.34%, #37186F 100%)',
      }}
    >
      {/* Background image (user replaces this) */}
      <div className="absolute inset-0">
        <img
          src="/games/song-quiz/menu-bg.jpg"
          alt=""
          className="w-full h-full object-cover opacity-60"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </div>

      {/* Menu options container */}
      <div
        className="absolute left-0 right-0 flex justify-center"
        style={{ top: '52.22vh', gap: '2.08vw' }}
      >
        {MENU_ITEMS.map((item, index) => (
          <GameMenuItem
            key={item}
            label={item}
            index={index}
            isFocused={focusedIndex === index}
            isPressing={isPressing && focusedIndex === index}
          />
        ))}
      </div>

      {/* Focus frame overlay */}
      <GameMenuFocusFrame
        focusedIndex={focusedIndex}
        bounceDirection={bounceDirection}
        isPressing={isPressing}
      />
    </div>
  );
}
