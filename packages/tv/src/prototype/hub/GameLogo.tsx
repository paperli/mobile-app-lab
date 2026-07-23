// Stylized wordmark. "The logotype is the only thing carrying the name" —
// so each game renders its title with a distinct type treatment derived from
// theme.logo. Size is inherited from the parent's fontSize (set by the tile /
// hero), so one component scales everywhere.
import type { CSSProperties } from 'react';
import type { GameTheme, LogoStyle } from './games';
import { hexToRgba } from './artStyles';

const FAMILY: Record<LogoStyle, string> = {
  block: "'Arial Black', 'Helvetica Neue', Impact, sans-serif",
  serif: "Georgia, 'Times New Roman', 'Playfair Display', serif",
  script: "'Brush Script MT', 'Segoe Script', 'Snell Roundhand', cursive",
  rounded: "'Trebuchet MS', 'Verdana', system-ui, sans-serif",
  stencil: "'Arial Black', 'Impact', sans-serif",
};

// `onDark` = the wordmark sits on a dark backdrop (e.g. the hero, where a
// game's art is faded to the stage colour behind the text). Light-brand games
// carry a dark `ink` meant for their bright tile art, which vanishes there — so
// force a light ink and treat it as a dark-background treatment.
function logoCss(theme: GameTheme, onDark = false): CSSProperties {
  const themeInk = theme.ink ?? '#F3F4F1';
  const onLightBg = theme.light && !onDark; // dark-ink-on-bright-art only when not forced onto dark
  const ink = onDark && theme.light ? '#F3F4F1' : themeInk;
  const style = theme.logo;
  const base: CSSProperties = {
    fontFamily: FAMILY[style],
    fontSize: 'inherit',
    lineHeight: 0.95,
    color: ink,
    margin: 0,
    display: 'inline-block',
    maxWidth: '100%',
  };

  switch (style) {
    case 'block':
      return {
        ...base,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: '-0.02em',
        transform: 'skewX(-6deg)',
        textShadow: onLightBg ? 'none' : `0 0.04em 0.12em rgba(0,0,0,0.6), 0 0 0.5em ${hexToRgba(theme.accent, 0.35)}`,
      };
    case 'serif':
      return {
        ...base,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.015em',
        color: theme.accent,
        textShadow: onLightBg ? 'none' : '0 0.03em 0.1em rgba(0,0,0,0.7)',
      };
    case 'script':
      return {
        ...base,
        fontWeight: 400,
        fontStyle: 'italic',
        letterSpacing: '0.01em',
        color: theme.accent,
        textShadow: onLightBg ? '0 0.02em 0.04em rgba(0,0,0,0.15)' : '0 0.03em 0.1em rgba(0,0,0,0.6)',
      };
    case 'rounded':
      return {
        ...base,
        fontWeight: 800,
        letterSpacing: '-0.01em',
        textShadow: onLightBg
          ? `0 0.03em 0 ${hexToRgba(theme.accent, 0.9)}`
          : `0 0.04em 0.12em rgba(0,0,0,0.5)`,
      };
    case 'stencil':
      return {
        ...base,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        color: 'transparent',
        WebkitTextStroke: `0.035em ${ink}`,
        textShadow: `0 0 0.5em ${hexToRgba(theme.accent, 0.5)}`,
      };
  }
}

interface GameLogoProps {
  title: string;
  theme: GameTheme;
  className?: string;
  style?: CSSProperties;
  /** The wordmark sits on a dark backdrop (hero/preview); force a legible ink. */
  onDark?: boolean;
  /** Real exported wordmark PNG. When set, renders the image at its designed
   *  size (contain-fit within the runbook's max box) instead of procedural type. */
  src?: string;
  /** Max box for the raster wordmark (hero-v3 "Top Game Preview" default:
   *  ≤720×180). The logo is shown as-is up to this box; never upscaled. */
  maxLogoW?: number;
  maxLogoH?: number;
}

// hero-v3 "Top Game Preview" logo box — contain-fit ≤ 720×180, min height 80.
// https://volley-inc.github.io/arcade-runbook/hero-v3.html
const LOGO_MAX_W = 720;
const LOGO_MAX_H = 180;

export function GameLogo({ title, theme, className, style, onDark, src, maxLogoW = LOGO_MAX_W, maxLogoH = LOGO_MAX_H }: GameLogoProps) {
  if (src) {
    // Show the wordmark at its designed size, contain-fit within the max box
    // (both max-width and max-height set → the browser scales down
    // proportionally to fit either bound). Intrinsic size is never upscaled, so
    // "as is" holds for logos already inside the box.
    return (
      <img
        src={src}
        alt={title}
        className={className}
        style={{ display: 'block', width: 'auto', height: 'auto', maxWidth: maxLogoW, maxHeight: maxLogoH, ...style }}
      />
    );
  }
  return (
    <span className={className} style={{ ...logoCss(theme, onDark), ...style }}>
      {title}
    </span>
  );
}
