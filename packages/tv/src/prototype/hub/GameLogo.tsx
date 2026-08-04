// Stylized wordmark. "The logotype is the only thing carrying the name" —
// so each game renders its title with a distinct type treatment derived from
// theme.logo. Size is inherited from the parent's fontSize (set by the tile /
// hero), so one component scales everywhere.
import { useState, useCallback } from 'react';
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
  /**
   * Scale the wordmark by this much of its exported size (the detail pages use
   * it). Each logo keeps its own proportions relative to the others, so nothing
   * is stretched to hit a common height. `maxLogoW` still caps the width, and a
   * logo that hits it scales down to fit.
   */
  scale?: number;
}

// hero-v3 "Top Game Preview" logo box — contain-fit ≤ 720×180, min height 80.
// https://volley-inc.github.io/arcade-runbook/hero-v3.html
const LOGO_MAX_W = 720;
const LOGO_MAX_H = 180;

/**
 * Exported wordmark dimensions, keyed by src and shared by every GameLogo.
 *
 * `scale` needs the natural size to lay the image out, and a FLIP measures that
 * layout the same frame it commits — so the size has to be readable
 * *synchronously* on the first render of a src. Per-instance state can't do
 * that: the detail pages stay mounted between games, so every new src was laid
 * out against the *previous* logo's dimensions until its own `load` fired. That
 * is what sent the immersive hero wordmark flying in from the wrong rect — and
 * made it jump once the real size arrived — whenever a game was opened after
 * another one.
 *
 * The cache is warm by the time it matters: the same PNG is on screen in the
 * preview band / tile before the detail page can be opened, and that instance
 * records it here.
 */
const NATURAL = new Map<string, { w: number; h: number }>();

export function GameLogo({
  title,
  theme,
  className,
  style,
  onDark,
  src,
  maxLogoW = LOGO_MAX_W,
  maxLogoH = LOGO_MAX_H,
  scale,
}: GameLogoProps) {
  // Exported size, once known, so the scale can be applied to it. Read from the
  // shared cache (never from state) so a src whose size is already known lays
  // out correctly on its very first render.
  const [, redraw] = useState(0);
  const natural = src ? NATURAL.get(src) ?? null : null;
  /**
   * Cache the exported size the first time this src is seen, then re-render.
   *
   * Only ever records a size that belongs to *this* src. The same <img> is
   * reused from one game to the next, and until the new file arrives it still
   * reports the previous logo's dimensions — caching those would poison the
   * entry for good (and stretch the wordmark to the other game's aspect).
   */
  const note = useCallback(
    (img: HTMLImageElement | null) => {
      if (!img || !src || NATURAL.has(src)) return;
      if (!img.complete || !img.naturalWidth) return;
      if (img.currentSrc && img.currentSrc !== new URL(src, document.baseURI).href) return;
      NATURAL.set(src, { w: img.naturalWidth, h: img.naturalHeight });
      redraw((n) => n + 1);
    },
    [src]
  );
  // `onLoad` is the normal path; `ref` also covers an image the browser already
  // had decoded when the element mounted.
  const measure = { ref: note, onLoad: (e: { currentTarget: HTMLImageElement }) => note(e.currentTarget) };

  if (src && scale) {
    // A wordmark wider than `maxLogoW` at this scale is brought back by scaling
    // *both* axes. Letting max-width do it while the height is pinned squashes
    // the artwork instead — Spot On rendered at 2.22:1 against its natural 2.58:1.
    // Both axes are written out from the cached export size rather than left to
    // `width: auto`: an <img> whose src just changed keeps sizing itself from
    // the bitmap it still has on screen, so `auto` would hand the frame that
    // opens the page the *previous* logo's aspect.
    let w: number | 'auto' = 'auto';
    let h: number | 'auto' = 'auto';
    if (natural) {
      const fit = Math.min(1, maxLogoW / (natural.w * scale));
      w = natural.w * scale * fit;
      h = natural.h * scale * fit;
    }
    return (
      <img
        src={src}
        alt={title}
        className={className}
        {...measure}
        // Until the exported size is known the box is capped, so an unmeasured
        // logo can't briefly lay itself out at full intrinsic size.
        style={{ display: 'block', width: w, height: h, maxWidth: natural ? undefined : maxLogoW, ...style }}
      />
    );
  }
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
        // Warms the shared size cache for the detail pages, which need this
        // logo's exported size the frame they open.
        {...measure}
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
