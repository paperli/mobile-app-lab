// Metadata pill — a rounded chip with a leading glyph/icon + label. Two styles:
//   · default        — the original emoji-glyph chip (used everywhere except the
//                       curated hub, so existing variations stay unchanged)
//   · ds (Weekend DS) — the Figma "Hero/Property" pill (Game Preview Creation Kit
//                       node 13802-17344): fully-rounded, 12% warm-white frosted
//                       fill + 28px backdrop blur, 1px 12% border, inset highlight,
//                       24px Canary line icon + 24px label. Only the hub9 hero
//                       opts in via `ds`.
import type { Interaction } from './games';
import { useHubTheme } from './hubTheme';

const FONT = "'Weekend Repro', ui-sans-serif, system-ui, sans-serif";

// DS glyph assets (canary SVGs) — served from public/brand/icons.
const ICON = {
  players: '/brand/icons/players.svg',
  player: '/brand/icons/player.svg',
  voice: '/brand/icons/voice.svg',
  gesture: '/brand/icons/gesture.svg',
} as const;

// Interactions with a DS glyph; others fall back to the emoji glyph below.
const INTERACTION_ICON: Partial<Record<Interaction, string>> = {
  'Voice Controlled': ICON.voice,
  'Gesture Controlled': ICON.gesture,
};

const INTERACTION_GLYPH: Record<Interaction, string> = {
  'Voice Controlled': '🎙️',
  'Gyro Controlled': '🎯',
  'Gesture Controlled': '✋',
  'Motion Capture': '🕺',
  'Touch Controlled': '👆',
  Typing: '⌨️',
  Buzzer: '🔔',
};

export function interactionGlyph(interaction: Interaction): string {
  return INTERACTION_GLYPH[interaction];
}

interface MetadataPillProps {
  /** DS icon asset (canary line glyph); DS style only. */
  iconSrc?: string;
  /** Emoji glyph — the default style always uses this; DS uses it as a fallback. */
  glyph?: string;
  label: string;
  /** Pill height in px; icon/text/padding scale from it. */
  size?: number;
  /** Render the Weekend DS pill (frosted + canary icon) instead of the original. */
  ds?: boolean;
}

export function MetadataPill({ iconSrc, glyph, label, size = 40, ds = false }: MetadataPillProps) {
  if (!ds) {
    // Original emoji-glyph chip — unchanged, keeps existing variations as-is.
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
          fontFamily: FONT,
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

  // Weekend DS pill.
  const icon = size * 0.375; // 24 @ 64
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size * 0.1875, // 12 @ 64
        height: size,
        padding: `0 ${size * 0.375}px`, // 24 @ 64
        borderRadius: 9999,
        background: 'rgba(255,255,255,0.12)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: 'inset 2px 2px 1px rgba(255,255,255,0.09)',
        color: '#F3F4F1',
        fontFamily: FONT,
        fontSize: size * 0.375, // 24 @ 64
        fontWeight: 500,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {iconSrc ? (
        <img src={iconSrc} alt="" aria-hidden style={{ width: icon, height: icon, display: 'block', flex: '0 0 auto' }} />
      ) : (
        <span aria-hidden style={{ fontSize: icon, lineHeight: 1 }}>
          {glyph}
        </span>
      )}
      {label}
    </span>
  );
}

interface GameMetaPillsProps {
  players: string;
  interaction: Interaction;
  size?: number;
}

/**
 * The two standard hub pills for a game (players + interaction). Style follows
 * the active hub theme: `arcade` → DS frosted pill + Canary icons; `mockup` (the
 * default outside a provider) → the original emoji-glyph chips.
 */
export function GameMetaPills({ players, interaction, size }: GameMetaPillsProps) {
  const { dsPills, pillSize } = useHubTheme();
  const h = size ?? pillSize;
  if (!dsPills) {
    return (
      <div style={{ display: 'flex', gap: h * 0.3, flexWrap: 'wrap' }}>
        <MetadataPill glyph="👥" label={players} size={h} />
        <MetadataPill glyph={interactionGlyph(interaction)} label={interaction} size={h} />
      </div>
    );
  }
  const playersIcon = /single/i.test(players) ? ICON.player : ICON.players;
  const interactionIcon = INTERACTION_ICON[interaction];
  return (
    <div style={{ display: 'flex', gap: h * 0.25, flexWrap: 'wrap' }}>
      <MetadataPill ds iconSrc={playersIcon} label={players} size={h} />
      <MetadataPill
        ds
        iconSrc={interactionIcon}
        glyph={interactionIcon ? undefined : interactionGlyph(interaction)}
        label={interaction}
        size={h}
      />
    </div>
  );
}
