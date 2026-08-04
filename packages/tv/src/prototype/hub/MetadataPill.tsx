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
import { assetUrl } from '../../utils/assetUrl';

const FONT = "'Weekend Repro', ui-sans-serif, system-ui, sans-serif";

// DS glyph assets (canary SVGs) — served from public/brand/icons (base-aware).
const ICON = {
  players: assetUrl('/brand/icons/players.svg'),
  player: assetUrl('/brand/icons/player.svg'),
  voice: assetUrl('/brand/icons/voice.svg'),
  gesture: assetUrl('/brand/icons/gesture.svg'),
  typing: assetUrl('/brand/icons/typing.svg'),
} as const;

// Interactions with a DS glyph; others fall back to the emoji glyph below.
const INTERACTION_ICON: Partial<Record<Interaction, string>> = {
  'Voice Controlled': ICON.voice,
  'Gesture Controlled': ICON.gesture,
  Typing: ICON.typing,
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

/** Fixed metrics of the DS metadata chip (see the `ds` branch below). */
const DS_PILL = { icon: 24, gap: 12, padX: 16, radius: 8, font: 24 } as const;

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

  // Weekend DS pill — a squared chip on a flat 12% fill: no hairline, no inner
  // highlight and no backdrop blur, which is what reads cleanly over both the
  // hero art and the detail pages' grounds.
  //
  // Its metrics are fixed by the DS rather than scaled off `size`, because a
  // metadata chip is one size: a 24px label (the `metadata` type token), a 24px
  // icon, 12px between them, 16px of side padding and an 8px corner. `size` sets
  // the height alone.
  const icon = DS_PILL.icon;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: DS_PILL.gap,
        height: size,
        padding: `0 ${DS_PILL.padX}px`,
        borderRadius: DS_PILL.radius,
        background: 'rgba(255,255,255,0.12)',
        color: '#F3F4F1',
        fontFamily: FONT,
        fontSize: DS_PILL.font,
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
