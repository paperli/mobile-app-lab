import { useEffect, useRef, useState } from 'react';

const AUTOPLAY_MS = 4000;
const CANARY = 'rgb(var(--palette-canary-500))';

/**
 * Auto-scrolling carousel of game-idea prompts (mirrors the TV hub hero: timed
 * auto-advance + dots), adapted for touch — swipe to change, tap a card to drop
 * that idea into the text field. Auto-advance pauses briefly after a touch.
 */
export function IdeaCarousel({ ideas, onPick }: { ideas: readonly string[]; onPick: (idea: string) => void }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const moved = useRef(false);

  useEffect(() => {
    if (paused || ideas.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % ideas.length), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [paused, ideas.length]);

  const go = (next: number) => setIndex(((next % ideas.length) + ideas.length) % ideas.length);

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
    moved.current = false;
    setPaused(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    if (Math.abs(e.touches[0].clientX - touchX.current) > 8) moved.current = true;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchX.current;
    touchX.current = null;
    // Resume auto-advance a moment after the interaction settles.
    setTimeout(() => setPaused(false), 2500);
    if (start == null) return;
    const dx = e.changedTouches[0].clientX - start;
    if (dx < -40) go(index + 1);
    else if (dx > 40) go(index - 1);
  };

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{ overflow: 'hidden', width: '100%' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          style={{
            display: 'flex',
            transform: `translateX(-${index * 100}%)`,
            transition: 'transform 360ms cubic-bezier(.22,.61,.36,1)',
          }}
        >
          {ideas.map((idea, i) => (
            <button
              key={i}
              onClick={() => {
                // Ignore taps that were really swipes.
                if (!moved.current) onPick(idea);
              }}
              style={{
                flex: '0 0 100%',
                boxSizing: 'border-box',
                textAlign: 'left',
                appearance: 'none',
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.05)',
                color: '#F3F4F1',
                borderRadius: 18,
                padding: '18px 20px',
                minHeight: 108,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: CANARY }}>IDEA</span>
              <span style={{ fontSize: 17, lineHeight: 1.3, fontWeight: 600 }}>{idea}</span>
              <span style={{ fontSize: 13, color: 'rgba(243,244,241,0.5)' }}>Tap to use this idea →</span>
            </button>
          ))}
        </div>
      </div>
      {/* Dots */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
        {ideas.map((_, i) => (
          <span
            key={i}
            style={{
              height: 6,
              width: i === index ? 20 : 6,
              borderRadius: 999,
              background: i === index ? CANARY : 'rgba(255,255,255,0.25)',
              transition: 'width 200ms ease, background 200ms ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}
