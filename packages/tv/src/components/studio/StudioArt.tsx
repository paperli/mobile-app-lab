import { useState, type CSSProperties } from 'react';

/**
 * A drop-in placeholder for Studio artwork the user will supply later. Renders
 * the real image if it loads from `src`; until the asset exists it falls back to
 * a labeled dashed box so the layout is complete. Swapping in final art is just
 * dropping the file at the referenced path under `public/games/studio/`.
 */
export function StudioArt({
  src,
  label,
  emoji = '🎨',
  style,
}: {
  src?: string;
  label: string;
  emoji?: string;
  style?: CSSProperties;
}) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={label}
        onError={() => setFailed(true)}
        style={{ objectFit: 'contain', ...style }}
      />
    );
  }
  return (
    <div
      aria-label={label}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        border: '2px dashed rgba(255,255,255,0.22)',
        borderRadius: 24,
        background: 'rgba(255,255,255,0.03)',
        color: 'rgba(243,244,241,0.6)',
        fontFamily: "'Weekend Repro', ui-sans-serif, system-ui, sans-serif",
        textAlign: 'center',
        padding: 24,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <span style={{ fontSize: '3em', lineHeight: 1 }}>{emoji}</span>
      <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: '0.02em' }}>{label}</span>
    </div>
  );
}

// Intended asset paths (public/games/studio/…). Referenced everywhere so the
// user only has to drop files here to replace every placeholder at once.
export const STUDIO_ART = {
  characterMic: '/games/studio/character-mic.png', // connect screen — big character w/ mic
  gameMasterPrompt: '/games/studio/game-master-prompt.png', // prompt screen — asking
  gameMasterThinking: '/games/studio/game-master-thinking.png', // generating — thinking
  gameMasterIdle: '/games/studio/game-master-idle.png', // game overlay — floating idle
  gameMasterListening: '/games/studio/game-master-listening.png', // game overlay — listening
  jeopardyPodium: '/games/studio/jeopardy-podium.png', // game preview — podium board
} as const;
