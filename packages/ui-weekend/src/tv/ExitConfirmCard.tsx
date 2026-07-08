import { type CSSProperties } from 'react';
import { Button } from '../primitives/Button';
import { ModalPanel } from '../primitives/ModalPanel';
import { bounceTransition } from './bounce';

export interface ExitConfirmCardProps {
  title?: string;
  description?: string;
  yesLabel?: string;
  noLabel?: string;
  /** Index of the focused button. 0 = Yes, 1 = No. */
  focusedIndex: number;
  /** Whether the card (rather than the tab row) is the current focus layer. */
  focused: boolean;
  /**
   * Transient transform applied to the focused button on invalid d-pad press.
   * Provided by the parent so bounce state stays with the overlay.
   */
  bounceStyle?: CSSProperties;
}

/**
 * Reusable confirmation card used by the System Menu Exit tab (confirm variant).
 * Renders the question, description, and Yes/No buttons on a Midnight Blue
 * ModalPanel using the DS Button primitive — selected = Canary primary pill,
 * unselected = outlined.
 */
export function ExitConfirmCard({
  title = 'Exit the game?',
  description = "You'll return to the hub and your current session will end.",
  yesLabel = 'Yes',
  noLabel = 'No',
  focusedIndex,
  focused,
  bounceStyle,
}: ExitConfirmCardProps) {
  const items = [yesLabel, noLabel];

  return (
    <ModalPanel
      tone="midnight"
      className="flex flex-col items-center text-center"
      style={{ padding: '64px' }}
    >
      <h3 className="text-display-3 font-semibold text-fg">{title}</h3>
      <p className="text-body text-fg-muted" style={{ maxWidth: '44vw', marginTop: '32px' }}>
        {description}
      </p>
      <div className="flex justify-center" style={{ gap: '2vw', marginTop: '48px' }}>
        {items.map((label, idx) => {
          const isFocused = focused && idx === focusedIndex;
          const style: CSSProperties = {
            minWidth: '10vw',
            transition: `${bounceTransition}, transform 150ms ease-out`,
            ...(isFocused && bounceStyle ? bounceStyle : null),
          };
          return (
            <Button
              key={label}
              variant={isFocused ? 'primary' : 'soft'}
              size="compact"
              style={style}
              tabIndex={-1}
            >
              {label}
            </Button>
          );
        })}
      </div>
    </ModalPanel>
  );
}
