import { useState, useEffect } from 'react';
import { FocusFrame } from '@weekend/ui';

type Dir = 'left' | 'right' | 'up' | 'down';

const TILE_WIDTH = 20;
const TILE_GAP = 2;
const TILE_HEIGHT = (TILE_WIDTH * 9) / 16;
const VISIBLE_COUNT = 4;
const VISIBLE_BLOCK_WIDTH = TILE_WIDTH * VISIBLE_COUNT + TILE_GAP * (VISIBLE_COUNT - 1);
const FIRST_TILE_OFFSET = (100 - VISIBLE_BLOCK_WIDTH) / 2;
const TOTAL = 6;

export default function FocusFrameStory() {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [bounceDirection, setBounceDirection] = useState<Dir | null>(null);
  const [isPressing, setIsPressing] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setFocusedIndex((i) => {
          if (i === TOTAL - 1) {
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

  const rowOffset =
    focusedIndex >= VISIBLE_COUNT
      ? -(focusedIndex - (VISIBLE_COUNT - 1)) * (TILE_WIDTH + TILE_GAP)
      : 0;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">FocusFrame</h2>
      <p className="text-fg-muted text-sm">
        &larr; / &rarr; to move focus (6 tiles, {VISIBLE_COUNT} visible — row scrolls past the visible window), Enter to press.
      </p>
      <div className="relative w-full overflow-hidden" style={{ minHeight: 240 }}>
        <div style={{ position: 'relative', height: `${TILE_HEIGHT}vw` }}>
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
            {Array.from({ length: TOTAL }).map((_, i) => (
              <div
                key={i}
                className="bg-bg-elevated rounded-2xl flex items-center justify-center"
                style={{ width: `${TILE_WIDTH}vw`, height: `${TILE_HEIGHT}vw` }}
              >
                Tile {i + 1}
              </div>
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
