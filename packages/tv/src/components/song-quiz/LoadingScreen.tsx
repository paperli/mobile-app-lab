import { useState, useEffect } from 'react';

export function LoadingScreen() {
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center"
      style={{
        background: 'linear-gradient(108deg, #1C0C36 0%, #230F43 63.34%, #37186F 100%)',
      }}
    >
      <img
        src="/games/song-quiz/image_spinner.png"
        alt=""
        className="w-[8vw] h-[8vw] animate-spin"
        style={{ animationDuration: '1.2s', animationTimingFunction: 'linear' }}
      />
      <div className="relative" style={{ marginTop: '32px', fontSize: '42px' }}>
        <span className="text-white font-bold">Loading</span>
        <span className="text-white font-bold absolute left-full top-0">{'.'.repeat(dotCount)}</span>
      </div>
    </div>
  );
}
