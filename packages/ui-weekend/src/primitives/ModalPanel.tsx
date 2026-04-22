import { forwardRef, type HTMLAttributes } from 'react';

export interface ModalPanelProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Tone of the panel. "midnight" (default) = the Weekend Midnight Blue
   * system-menu surface. "elevated" = the existing bg-elevated for plain modals.
   */
  tone?: 'midnight' | 'elevated';
  /** Adds a subtle stroke highlight. */
  stroke?: boolean;
}

// Token is applied via inline style so the panel doesn't rely on Tailwind JIT
// picking up a newly-added semantic color class — this is the canonical
// midnight-blue surface, it must render regardless of content-glob state.
const TONE_STYLE: Record<NonNullable<ModalPanelProps['tone']>, React.CSSProperties> = {
  midnight: { backgroundColor: 'rgb(var(--color-bg-midnight))' },
  elevated: { backgroundColor: 'rgb(var(--color-bg-elevated))' },
};

export const ModalPanel = forwardRef<HTMLDivElement, ModalPanelProps>(
  function ModalPanel({ tone = 'midnight', stroke = true, className, style, children, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={[
          'relative rounded-card text-fg',
          stroke ? 'ring-1 ring-white/10' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ ...TONE_STYLE[tone], ...style }}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
