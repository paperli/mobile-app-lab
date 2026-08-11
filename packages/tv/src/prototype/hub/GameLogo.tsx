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
  /** Real exported wordmark PNG, delivered at 2× (see LOGO_EXPORT_SCALE). When
   *  set, renders the image at its designed size (contain-fit within the
   *  runbook's max box) instead of procedural type. */
  src?: string;
  /** Max box for the raster wordmark (hero-v3 "Top Game Preview" default:
   *  ≤720×180). The logo is shown as-is up to this box; never upscaled. */
  maxLogoW?: number;
  maxLogoH?: number;
  /**
   * Scale the wordmark by this much of its *designed* size (the detail pages use
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
 * Every game ships its wordmark at 2× its designed size.
 *
 * The detail page shows the logotype at 1.5×, so a 1:1 export would have to be
 * upscaled there and would go soft on a 4K panel. Asking for 2× instead makes
 * the *largest* rendering (1.5 × designed = 0.75 of the bitmap) still a
 * downscale, and the top preview band — which shows the designed size — draws
 * the image at 0.5×. Nothing is ever upsampled.
 *
 * So the bitmap's natural size is not the layout size: divide by this first,
 * and every `scale` below is relative to the designed size.
 */
const LOGO_EXPORT_SCALE = 2;

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
  // out correctly on its very first render. The bitmap is a 2× asset, so the
  // designed size — what every scale below is relative to — is half of it.
  const [, redraw] = useState(0);
  const natural = src ? NATURAL.get(src) ?? null : null;
  const designed = natural && { w: natural.w / LOGO_EXPORT_SCALE, h: natural.h / LOGO_EXPORT_SCALE };
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

  if (src) {
    // Both axes are written out from the cached export size rather than left to
    // `width: auto`: the 2× bitmap would otherwise lay itself out at twice the
    // designed size, and an <img> whose src just changed keeps sizing itself
    // from the bitmap it still has on screen — so `auto` would also hand the
    // frame that opens the detail page the *previous* logo's aspect.
    let w: number | 'auto' = 'auto';
    let h: number | 'auto' = 'auto';
    if (designed) {
      // A wordmark that overruns its box is brought back by scaling *both*
      // axes. Letting max-width do it while the height is pinned squashes the
      // artwork instead — Spot On rendered at 2.22:1 against its natural 2.58:1.
      //
      // Scaled (the detail pages): only the width is capped — the hero's box is
      // deliberately taller than the runbook's preview box. Unscaled (preview
      // band / hero slide): contain-fit within the whole box.
      const fit = scale
        ? Math.min(1, maxLogoW / (designed.w * scale))
        : Math.min(1, maxLogoW / designed.w, maxLogoH / designed.h);
      w = designed.w * (scale ?? 1) * fit;
      h = designed.h * (scale ?? 1) * fit;
    }
    return (
      <img
        src={src}
        alt={title}
        className={className}
        // `onLoad`/`ref` warm the shared size cache — the detail pages need this
        // logo's exported size the frame they open.
        {...measure}
        // Until the exported size is known the box is capped, so an unmeasured
        // logo can't briefly lay itself out at full intrinsic size.
        style={{
          display: 'block',
          width: w,
          height: h,
          maxWidth: designed ? undefined : maxLogoW,
          maxHeight: designed || scale ? undefined : maxLogoH,
          ...style,
        }}
      />
    );
  }
  return (
    <span className={className} style={{ ...logoCss(theme, onDark), ...style }}>
      {title}
    </span>
  );
}
