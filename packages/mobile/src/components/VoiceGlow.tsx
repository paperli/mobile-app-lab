import { useEffect, useState, useRef } from 'react';
import { TVScreen } from '@mobile-app-lab/shared';

interface VoiceGlowProps {
  volume: number; // 0-1 range
  isActive: boolean;
  minOpacity?: number;
  maxOpacity?: number;
  tvScreen?: TVScreen;
}

type TransitionState = 'visible' | 'exiting' | 'hidden' | 'entering';

// Timing constants (in ms, converted from frames at 60fps)
const EXIT_SCALE_DURATION = (39 / 60) * 1000;   // 650ms
const EXIT_FADE_DELAY = (24 / 60) * 1000;        // 400ms
const EXIT_FADE_DURATION = (15 / 60) * 1000;     // 250ms
const ENTER_DURATION = 400;

export function VoiceGlow({
  volume,
  isActive,
  minOpacity = 0.4,
  maxOpacity = 0.95,
  tvScreen = 'hub',
}: VoiceGlowProps) {
  const [hueOffset, setHueOffset] = useState(0);
  const [waveOffset, setWaveOffset] = useState(0);
  const [transition, setTransition] = useState<TransitionState>('visible');
  const [scaleX, setScaleX] = useState(1);
  const [scaleY, setScaleY] = useState(1);
  const [fadeOpacity, setFadeOpacity] = useState(1);
  const [translateY, setTranslateY] = useState(0);
  const animFrameRef = useRef<number>(0);
  const prevTvScreenRef = useRef<TVScreen>(tvScreen);

  const isHub = tvScreen === 'hub';

  // Handle tvScreen transitions
  useEffect(() => {
    const prev = prevTvScreenRef.current;
    prevTvScreenRef.current = tvScreen;

    console.log('[VoiceGlow] tvScreen changed:', prev, '→', tvScreen, 'isHub:', isHub, 'transition:', transition);

    if (prev === 'hub' && !isHub) {
      // Leaving hub → exit animation (scale up + fade out)
      console.log('[VoiceGlow] Starting EXIT animation');
      setTransition('exiting');
      const startTime = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTime;

        // Scale + move: over EXIT_SCALE_DURATION (39/60s)
        const scaleProgress = Math.min(elapsed / EXIT_SCALE_DURATION, 1);
        const eased = 1 - Math.pow(1 - scaleProgress, 2); // ease-out quad
        const newScaleX = 1 + eased * 1.62;
        const newScaleY = 1 + eased * 1.88;
        const newTranslateY = -eased * 800;
        setScaleX(newScaleX);
        setScaleY(newScaleY);
        setTranslateY(newTranslateY);
        if (Math.round(elapsed) % 100 < 17) {
          console.log(`[VoiceGlow] exit: elapsed=${Math.round(elapsed)}ms scaleX=${newScaleX.toFixed(2)} scaleY=${newScaleY.toFixed(2)} translateY=${Math.round(newTranslateY)} fadeOpacity=${fadeOpacity}`);
        }

        // Fade: after EXIT_FADE_DELAY, fade from current to 0 over EXIT_FADE_DURATION
        if (elapsed > EXIT_FADE_DELAY) {
          const fadeProgress = Math.min((elapsed - EXIT_FADE_DELAY) / EXIT_FADE_DURATION, 1);
          setFadeOpacity(1 - fadeProgress);
        }

        if (elapsed < EXIT_SCALE_DURATION) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          setTransition('hidden');
        }
      };

      animFrameRef.current = requestAnimationFrame(animate);
    } else if (!isHub) {
      // Already not on hub (e.g. initial load on game screen)
      setTransition('hidden');
      setFadeOpacity(0);
    } else if (prev !== 'hub' && isHub) {
      // Returning to hub → enter animation (fade in + slide up)
      setTransition('entering');
      setScaleX(1);
      setScaleY(1);
      setTranslateY(0);
      const startTime = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / ENTER_DURATION, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        setFadeOpacity(eased);

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          setTransition('visible');
        }
      };

      animFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [tvScreen, isHub]);

  // Animate hue rotation
  useEffect(() => {
    if (!isActive || transition === 'hidden') return;
    const interval = setInterval(() => {
      setHueOffset((prev) => (prev + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, [isActive, transition]);

  // Animate wave movement
  useEffect(() => {
    if (!isActive || transition === 'hidden') return;
    const interval = setInterval(() => {
      setWaveOffset((prev) => (prev + 2) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, [isActive, transition]);

  if (!isActive || transition === 'hidden') return null;

  const baseAmplitude = 10;
  const maxAmplitude = 70;
  const amplitude = baseAmplitude + (volume * (maxAmplitude - baseAmplitude));

  const easedVolume = 1 - Math.pow(1 - volume, 3);
  const opacityRange = maxOpacity - minOpacity;
  const opacity = (minOpacity + (easedVolume * opacityRange)) * fadeOpacity;

  const blur = 30 + (volume * 40);

  const generateWavePath = () => {
    const width = 100;
    const height = 190;
    const frequency = 2;
    const points: string[] = [];

    points.push(`M 0,${height}`);
    points.push(`L ${width},${height}`);

    for (let x = width; x >= 0; x -= 0.5) {
      const radians = ((x / width) * frequency * 360 + waveOffset) * (Math.PI / 180);
      const y = height - 40 - amplitude - Math.sin(radians) * amplitude * 0.5;
      points.push(`L ${x},${y}`);
    }

    points.push('Z');
    return points.join(' ');
  };

  // Enter animation: slide up from bottom
  const enterSlide = transition === 'entering' ? (1 - fadeOpacity) * 40 : 0;
  const totalTranslateY = translateY + enterSlide;

  return (
    <div
      className="pointer-events-none"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '190px',
        zIndex: 9999,
        overflow: 'visible',
      }}
    >
      <svg
        className="absolute bottom-0 left-0 w-full h-full"
        viewBox="0 0 100 190"
        preserveAspectRatio="none"
        style={{
          filter: `blur(${blur}px)`,
          transform: `scaleX(${scaleX}) scaleY(${scaleY}) translateY(${totalTranslateY}px)`,
          transformOrigin: 'center bottom',
          overflow: 'visible',
        }}
      >
        <defs>
          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={`hsl(${(hueOffset + 0) % 360}, 80%, 60%)`} stopOpacity={opacity} />
            <stop offset="16.67%" stopColor={`hsl(${(hueOffset + 60) % 360}, 80%, 60%)`} stopOpacity={opacity} />
            <stop offset="33.33%" stopColor={`hsl(${(hueOffset + 120) % 360}, 80%, 60%)`} stopOpacity={opacity} />
            <stop offset="50%" stopColor={`hsl(${(hueOffset + 180) % 360}, 80%, 60%)`} stopOpacity={opacity} />
            <stop offset="66.67%" stopColor={`hsl(${(hueOffset + 240) % 360}, 80%, 60%)`} stopOpacity={opacity} />
            <stop offset="83.33%" stopColor={`hsl(${(hueOffset + 300) % 360}, 80%, 60%)`} stopOpacity={opacity} />
            <stop offset="100%" stopColor={`hsl(${(hueOffset + 360) % 360}, 80%, 60%)`} stopOpacity={opacity} />
          </linearGradient>
        </defs>

        <path
          d={generateWavePath()}
          fill="url(#waveGradient)"
        />
      </svg>
    </div>
  );
}
