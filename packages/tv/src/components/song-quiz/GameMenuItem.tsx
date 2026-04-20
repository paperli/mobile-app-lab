interface GameMenuItemProps {
  label: string;
  index: number;
  isFocused: boolean;
  isPressing: boolean;
}

export function GameMenuItem({ label, index, isFocused, isPressing }: GameMenuItemProps) {
  const imageSrc = isFocused
    ? `/games/song-quiz/mode-${index}-focused.png`
    : `/games/song-quiz/mode-${index}-unfocused.png`;

  return (
    <div
      className={
        isPressing
          ? 'relative overflow-hidden transition-transform duration-150 ease-out scale-[0.95]'
          : 'relative overflow-hidden transition-all duration-300 ease-out'
      }
      style={{
        width: '18.85vw',  // 362px at 1920px
        height: '34.72vh', // 375px at 1080px
        borderRadius: '24px',
      }}
    >
      <img
        src={imageSrc}
        alt={label}
        className="w-full h-full object-cover"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    </div>
  );
}
