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
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-5 text-base',
        lg: 'h-14 px-7 text-lg',
        // TV sizes — 32px horizontal padding, labels at TV reading distance.
        xl: 'h-20 px-8 text-[32px]',       // 80px tall — system-menu Layer 1 tabs
        compact: 'h-[72px] px-8 text-2xl', // 72px tall — Layer 2 modal actions (Yes/No, Exit pill)
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
