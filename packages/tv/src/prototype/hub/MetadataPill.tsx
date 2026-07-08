// Metadata pill — a rounded chip with a leading glyph + label. Used in the
// hero for player count and interaction method (matches the Figma hub pills).
import type { Interaction } from './games';

const INTERACTION_GLYPH: Record<Interaction, string> = {
  'Voice Controlled': '🎙️',
  'Gyro Controlled': '🎯',
  'Gesture Controlled': '✋',
  'Motion Capture': '🕺',
  'Touch Controlled': '👆',
  Buzzer: '🔔',
};

export function interactionGlyph(interaction: Interaction): string {
  return INTERACTION_GLYPH[interaction];
}

interface MetadataPillProps {
  glyph: string;
  label: string;
  /** Pill height in px (glyph + text scale from it). */
  size?: number;
}

export function MetadataPill({ glyph, label, size = 40 }: MetadataPillProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size * 0.2,
        height: size,
        padding: `0 ${size * 0.42}px`,
        borderRadius: 9999,
        background: 'rgba(0, 0, 0, 0.42)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        backdropFilter: 'blur(6px)',
        color: '#F3F4F1',
        fontFamily: "'Weekend Repro', ui-sans-serif, system-ui, sans-serif",
        fontSize: size * 0.38,
        fontWeight: 600,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: size * 0.46 }}>{glyph}</span>
      {label}
    </span>
  );
}

interface GameMetaPillsProps {
  players: string;
  interaction: Interaction;
  size?: number;
}

/** Convenience: the two standard hub pills for a game. */
export function GameMetaPills({ players, interaction, size }: GameMetaPillsProps) {
  return (
    <div style={{ display: 'flex', gap: (size ?? 40) * 0.3, flexWrap: 'wrap' }}>
      <MetadataPill glyph="👥" label={players} size={size} />
      <MetadataPill glyph={interactionGlyph(interaction)} label={interaction} size={size} />
    </div>
  );
}
