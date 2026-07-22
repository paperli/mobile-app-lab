// TS-side token name constants (for consumers that need them in code, not CSS).
// Kept minimal — most usage flows through Tailwind utilities or raw CSS var references.
export const tokens = {
  duration: {
    fast: 150,
    base: 220,
  },
  easing: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// Numeric mirror of the spacing / shelf / tile CSS tokens (tokens.css).
// For consumers doing layout math in JS (e.g. the hub's translateX scroll
// calc) where a Tailwind class or CSS var string can't be used directly.
// Keep these in lock-step with tokens.css — this is the single source of
// truth for hub-row geometry, replacing the per-component TILE tables.
export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 40,
  8: 48,
  9: 64,
  10: 80,
  11: 96,
  12: 128,
} as const;

export const layout = {
  /** Fixed design width of the TV stage (1080p). */
  stageW: 1920,
  /** Leading inset shared by every row/grid — the page's left alignment line. */
  shelfGutter: space[10], // 80
  /** Gap between tiles, identical for every role. */
  shelfGap: space[6], // 32
  /** Row title -> tiles. */
  shelfHeaderGap: space[5], // 24
  /** Row -> row vertical rhythm. */
  shelfRowGap: space[7], // 40
  /** Edge-fade mask width — the "more ->" peek cue. */
  shelfFade: 130,
  /** All-Games grid columns (gutter-to-gutter). */
  gridCols: 5,
  tile: {
    /** One corner radius for every tile. */
    radius: 16,
    /** All tiles are 16:9; only width varies by role. */
    aspect: 16 / 9,
    /** Standard shelves + grids. 4 visible + a ~2/3-tile peek at gutter 80 / gap 32. */
    w: 368,
    /** 2x standard — spotlight/viral rows. */
    wFeatured: 736,
  },
  /**
   * Merchandising hero band (the rotating billboard at the top of the hub).
   * Shared @1x geometry so every prototype composes the same hero — the live
   * GameHub carousel and the Component Kit's Hero example both read from here.
   */
  hero: {
    /** Hero section height (@1x, of the 1920×1080 stage). */
    sectionH: 900,
    /** Game-art band height; the art fades into the content/rows below it. */
    artH: 820,
    /** Content column (logo / description / pills / CTA) bottom offset. */
    contentBottom: 150,
    /** Carousel dots bottom offset. */
    dotsBottom: 44,
  },
} as const;

/** Height of a 16:9 tile for a given width. */
export const tileHeight = (w: number) => (w * 9) / 16;

/**
 * All-Games grid tile width: `cols` tiles fit gutter-to-gutter across the stage,
 * with `shelfGutter` on both sides and `shelfGap` between. Defaults to the
 * standard 5-up grid on the 1920 stage → 326.4px.
 */
export const gridTileWidth = (cols: number = layout.gridCols, stageW: number = layout.stageW): number =>
  (stageW - 2 * layout.shelfGutter - (cols - 1) * layout.shelfGap) / cols;
