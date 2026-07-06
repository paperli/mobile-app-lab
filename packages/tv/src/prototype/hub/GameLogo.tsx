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

function logoCss(theme: GameTheme): CSSProperties {
  const ink = theme.ink ?? '#F3F4F1';
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
        textShadow: theme.light ? 'none' : `0 0.04em 0.12em rgba(0,0,0,0.6), 0 0 0.5em ${hexToRgba(theme.accent, 0.35)}`,
      };
    case 'serif':
      return {
        ...base,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.015em',
        color: theme.accent,
        textShadow: theme.light ? 'none' : '0 0.03em 0.1em rgba(0,0,0,0.7)',
      };
    case 'script':
      return {
        ...base,
        fontWeight: 400,
        fontStyle: 'italic',
        letterSpacing: '0.01em',
        color: theme.accent,
        textShadow: theme.light ? '0 0.02em 0.04em rgba(0,0,0,0.15)' : '0 0.03em 0.1em rgba(0,0,0,0.6)',
      };
    case 'rounded':
      return {
        ...base,
        fontWeight: 800,
        letterSpacing: '-0.01em',
        textShadow: theme.light
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
}

export function GameLogo({ title, theme, className, style }: GameLogoProps) {
  return (
    <span className={className} style={{ ...logoCss(theme), ...style }}>
      {title}
    </span>
  );
}
