import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

// Weekend button convention: labels render in their natural written case
// (e.g. "Exit Game", "Resume") — never force uppercase. If you find yourself
// adding `uppercase` to a Button className, check the copy instead.
const buttonStyles = cva(
  'inline-flex items-center justify-center gap-2 font-medium select-none transition-[transform,opacity] duration-fast ease-[var(--ease-standard)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary:
          'rounded-pill bg-[linear-gradient(180deg,rgb(var(--palette-canary-300))_0%,rgb(var(--palette-canary-500))_94.88%)] text-[rgb(var(--palette-midnight-blue))] shadow-cta-glow',
        outline:
          'rounded-pill border border-fg-20 text-fg bg-transparent hover:bg-fg-5',
        ghost:
          'rounded-pill text-fg bg-transparent hover:bg-fg-10',
        // Soft — 10% warm-white fill, no border. Used on Midnight Blue
        // surfaces to indicate "selected but not currently focused" (e.g.
        // active system-menu tab while Layer 2 has focus) or as the default
        // resting state for Yes/No-style modal actions.
        soft:
          'rounded-pill text-fg bg-fg-10 hover:bg-fg-15',
        // Secondary — muted pill with 6% warm-white fill and 12% border.
        // Use with size="secondary" for icon+label mobile actions (e.g.
        // "Back" button below the d-pad).
        secondary:
          'rounded-pill border-2 border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] text-fg hover:bg-[rgba(255,255,255,0.10)]',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-5 text-base',
        lg: 'h-14 px-7 text-lg',
        // TV sizes — 32px horizontal padding, labels at TV reading distance.
        xl: 'h-20 px-8 text-[32px]',       // 80px tall — system-menu Layer 1 tabs
        compact: 'h-[72px] px-8 text-2xl', // 72px tall — Layer 2 modal actions (Yes/No, Exit pill)
        // Secondary — 60px pill with icon+label. Pairs with variant="secondary".
        secondary: 'h-[60px] min-h-[60px] px-8 gap-3 text-[20px] leading-[19px] tracking-[-1px]',
        // Circular — 120x120 icon-only button. Pairs with variant="secondary".
        // Caller provides a 48x48 icon child.
        circular: 'h-[120px] w-[120px] min-h-[120px] min-w-[120px] p-0 gap-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonStyles> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild, variant, size, className, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={[buttonStyles({ variant, size }), className].filter(Boolean).join(' ')}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
