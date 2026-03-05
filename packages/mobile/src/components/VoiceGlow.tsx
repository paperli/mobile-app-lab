import { useEffect, useState } from 'react';

interface VoiceGlowProps {
  volume: number; // 0-1 range
  isActive: boolean;
  minOpacity?: number; // Minimum opacity at silence (default: 0.4)
  maxOpacity?: number; // Maximum opacity at loud volume (default: 0.95)
}

export function VoiceGlow({
  volume,
  isActive,
  minOpacity = 0.4,
  maxOpacity = 0.95
}: VoiceGlowProps) {
  const [hueOffset, setHueOffset] = useState(0);
  const [waveOffset, setWaveOffset] = useState(0);

  // Animate hue rotation for color shifting effect
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setHueOffset((prev) => (prev + 1) % 360);
    }, 50); // Update every 50ms for smooth color transitions

    return () => clearInterval(interval);
  }, [isActive]);

  // Animate wave movement
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setWaveOffset((prev) => (prev + 2) % 360);
    }, 30); // Update every 30ms for smooth wave animation

    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive) return null;

  // Calculate wave amplitude based on volume
  // Min amplitude: 10 (very subtle wave at silence)
  // Max amplitude: 70 (dramatic wave at loud volume)
  const baseAmplitude = 10;
  const maxAmplitude = 70;
  const amplitude = baseAmplitude + (volume * (maxAmplitude - baseAmplitude));

  // Calculate glow intensity based on volume with ease-out curve
  // Apply ease-out cubic: starts fast, slows down at the end
  const easedVolume = 1 - Math.pow(1 - volume, 3);
  // Calculate opacity range based on props
  const opacityRange = maxOpacity - minOpacity;
  const opacity = minOpacity + (easedVolume * opacityRange);

  // Calculate blur amount based on volume
  // Min blur: 30px, Max blur: 70px (less blur at silence for more definition)
  const blur = 30 + (volume * 40);

  // Generate wave path (sine wave)
  const generateWavePath = () => {
    const width = 100; // viewport width percentage
    const height = 190; // Height in pixels to cover wave + home indicator area
    const frequency = 2; // Number of wave cycles
    const points: string[] = [];

    // Start from bottom left corner
    points.push(`M 0,${height}`);

    // Draw line to bottom right corner
    points.push(`L ${width},${height}`);

    // Generate wave curve from right to left (top edge of wave)
    // Wave positioned 40px from bottom to account for home indicator
    for (let x = width; x >= 0; x -= 0.5) {
      const radians = ((x / width) * frequency * 360 + waveOffset) * (Math.PI / 180);
      // Wave extends upward from 40px above bottom, using amplitude for peaks
      const y = height - 40 - amplitude - Math.sin(radians) * amplitude * 0.5;
      points.push(`L ${x},${y}`);
    }

    // Close the path
    points.push('Z');

    return points.join(' ');
  };

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
      }}
    >
      {/* Wave visualization at bottom */}
      <svg
        className="absolute bottom-0 left-0 w-full h-full"
        viewBox="0 0 100 190"
        preserveAspectRatio="none"
        style={{
          filter: `blur(${blur}px)`,
        }}
      >
        <defs>
          {/* Gradient definition with shifting colors */}
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

        {/* Wave path */}
        <path
          d={generateWavePath()}
          fill="url(#waveGradient)"
        />
      </svg>
    </div>
  );
}
