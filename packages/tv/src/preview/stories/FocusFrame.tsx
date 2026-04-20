import { useState, useEffect } from 'react';
import { FocusFrame } from '@weekend/ui';

type Dir = 'left' | 'right' | 'up' | 'down';

export default function FocusFrameStory() {
  const totalItems = 4;
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [bounceDirection, setBounceDirection] = useState<Dir | null>(null);
  const [isPressing, setIsPressing] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setFocusedIndex((i) => {
          if (i === totalItems - 1) {
            setBounceDirection('right');
            setTimeout(() => setBounceDirection(null), 200);
            return i;
          }
          return i + 1;
        });
      } else if (e.key === 'ArrowLeft') {
        setFocusedIndex((i) => {
          if (i === 0) {
            setBounceDirection('left');
            setTimeout(() => setBounceDirection(null), 200);
            return i;
          }
          return i - 1;
        });
      } else if (e.key === 'Enter' || e.key === ' ') {
        setIsPressing(true);
        setTimeout(() => setIsPressing(false), 150);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">FocusFrame</h2>
      <p className="text-fg-muted text-sm">
        &larr; / &rarr; to move focus, Enter to press. FocusFrame is absolutely positioned relative to the TV viewport (20vw tiles), so it appears at the bottom of the full-screen preview.
      </p>
      <div className="relative w-full" style={{ height: '20vw', minHeight: 240 }}>
        <div className="flex justify-center gap-[2vw] px-[4vw]">
          {Array.from({ length: totalItems }).map((_, i) => (
            <div
              key={i}
              className="bg-bg-elevated rounded-2xl flex items-center justify-center"
              style={{ width: '20vw', height: `${20 * 9 / 16}vw` }}
            >
              Tile {i + 1}
            </div>
          ))}
        </div>
        <FocusFrame
          focusedIndex={focusedIndex}
          totalItems={totalItems}
          bounceDirection={bounceDirection}
          isPressing={isPressing}
        />
      </div>
    </div>
  );
}
