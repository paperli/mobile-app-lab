/**
 * The TV frame the prototypes present their 1920×1080 stage in.
 *
 * Shared rather than copied, because two prototypes now render it: the React
 * hub (GameHub) and the Lightning/Blits onboarding, which has no React in its
 * bundle. Everything here is plain data and arithmetic so both can use it.
 *
 * The rule: the frame appears only when the viewport is smaller than native.
 * At native or above, the stage runs full-bleed — a bezel around a 1:1 stage
 * would be pretending, and there's no scaling artefact to dress up.
 */

/** Design space every prototype lays out in. */
export const STAGE_W = 1920;
export const STAGE_H = 1080;

/** Breathing room between the TV and the viewport edge. */
export const FRAME_MARGIN = 28;
/** Bezel thickness on top / left / right. */
export const FRAME_BEZEL = 18;
/** Extra thickness on the bottom edge, for the brand and power LED. */
export const FRAME_CHIN = 16;

export interface StageFit {
  /** Multiplier to apply to the 1920×1080 stage. */
  scale: number;
  /** Whether the bezel should be drawn at this size. */
  framed: boolean;
}

/** Space to keep clear on top of the bezel, for chrome the caller draws itself. */
export interface StageReserve {
  w?: number;
  h?: number;
}

/**
 * Scale the stage to fill the viewport, letterboxing on aspect mismatch.
 *
 * When `framed` is asked for and the viewport is sub-native, room is reserved
 * for the bezel and outer margin so the framed set fits without overscroll.
 * `reserve` takes additional space off the top — the onboarding uses it to seat
 * its control bar below the TV rather than on top of the picture.
 */
export function fitStage(
  viewportW: number,
  viewportH: number,
  framed: boolean,
  reserve: StageReserve = {},
): StageFit {
  const showFrame = framed && (viewportW < STAGE_W || viewportH < STAGE_H);
  const bezelW = showFrame ? 2 * (FRAME_MARGIN + FRAME_BEZEL) : 0;
  const bezelH = showFrame ? 2 * FRAME_MARGIN + 2 * FRAME_BEZEL + FRAME_CHIN : 0;
  const scale = Math.min(
    (viewportW - bezelW - (reserve.w ?? 0)) / STAGE_W,
    (viewportH - bezelH - (reserve.h ?? 0)) / STAGE_H,
  );
  return { scale, framed: showFrame };
}

/**
 * The bezel's looks, as plain strings so a React style object and a DOM
 * `style` assignment can share them.
 */
export const TV_FRAME_CHROME = {
  /** Page behind the TV when the frame is showing. */
  pageBackground: '#050506',
  radius: 16,
  background: 'linear-gradient(160deg, #2a2b2e 0%, #151517 42%, #0c0c0e 100%)',
  /** Hairline on the outer edge, separating the frame from the page. */
  border: '1px solid rgba(255,255,255,0.10)',
  shadow:
    '0 2px 0 rgba(255,255,255,0.06) inset, 0 -2px 0 rgba(0,0,0,0.6) inset, 0 40px 90px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.55)',
  screenRadius: 6,
  /** Light outer ring, dark inner, delineating screen from bezel. */
  screenShadow:
    '0 0 0 1px rgba(0,0,0,0.85), 0 0 0 2px rgba(255,255,255,0.12), 0 6px 20px rgba(0,0,0,0.55)',
  ledSize: 6,
  ledBackground: 'radial-gradient(circle at 40% 35%, #d8d8dc, #6a6a70)',
  ledShadow: '0 0 6px rgba(220,220,225,0.5)',
} as const;
