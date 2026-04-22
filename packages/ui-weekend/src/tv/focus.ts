import type { CSSProperties } from 'react';

/**
 * Weekend Focus Frame — the canonical visual treatment for a focused tile.
 *
 * Spec (from Figma export):
 *   • border-radius: 21px
 *   • 12px gap between tile and frame
 *   • 8px gradient border, radial Limon → Sky (top-left → BR)
 *   • halo: box-shadow 0 0 24px 2px Sky-500 (outside the frame)
 *
 * Rendered as two stacked layers so the halo is never clipped by the mask:
 *
 *   <div style={{ ...FOCUS_FRAME_OUTER_STYLE, ...positioning }}>   ← halo + radius
 *     <div style={FOCUS_FRAME_INNER_STYLE} />                       ← gradient ring
 *   </div>
 *
 * CSS has no native gradient `border`, so the inner layer uses the
 * "padding + background + mask" recipe: padding acts as border thickness;
 * the radial gradient fills the element; the mask excludes the content-box
 * so only the padding ring paints. Outer layer is a plain div whose
 * box-shadow radiates unaffected by the mask.
 */
export const FOCUS_FRAME_RADIUS_PX = 21;
export const FOCUS_FRAME_BORDER_PX = 8;
/**
 * Gap between the tile and the inner edge of the focus-frame stroke.
 * Consumers should position the outer edge of the frame at
 * `FOCUS_FRAME_OFFSET_PX` (= gap + stroke) from the tile's edge.
 */
export const FOCUS_FRAME_GAP_PX = 12;
export const FOCUS_FRAME_OFFSET_PX = FOCUS_FRAME_GAP_PX + FOCUS_FRAME_BORDER_PX;

export const FOCUS_FRAME_OUTER_STYLE: CSSProperties = {
  borderRadius: `${FOCUS_FRAME_RADIUS_PX}px`,
  boxShadow: '0 0 24px 2px rgb(var(--palette-sky-500))',
  pointerEvents: 'none',
};

export const FOCUS_FRAME_INNER_STYLE: CSSProperties = {
  position: 'absolute',
  inset: 0,
  borderRadius: `${FOCUS_FRAME_RADIUS_PX}px`,
  padding: `${FOCUS_FRAME_BORDER_PX}px`,
  background:
    'radial-gradient(ellipse at 15% 15%, rgb(var(--palette-limon-500)) 0%, rgb(var(--palette-sky-500)) 100%)',
  WebkitMask:
    'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
  WebkitMaskComposite: 'xor',
  mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
  maskComposite: 'exclude',
  pointerEvents: 'none',
};

/**
 * Canary focus frame — alternate tint used on system-menu game tile selection.
 * Border uses the same gradient as the DS Button primary variant so the
 * focused tile visually echoes the primary action's treatment.
 * Halo (on the outer layer) is still Sky-500 per the base spec.
 */
export const FOCUS_FRAME_INNER_STYLE_CANARY: CSSProperties = {
  ...FOCUS_FRAME_INNER_STYLE,
  background:
    'linear-gradient(180deg, rgb(var(--palette-canary-300)) 0%, rgb(var(--palette-canary-500)) 94.88%)',
};
