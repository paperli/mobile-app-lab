import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonStyles = cva(
  'inline-flex items-center justify-center gap-2 font-medium select-none transition-[transform,opacity] duration-fast ease-[var(--ease-standard)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary:
          'rounded-pill bg-[linear-gradient(180deg,#FFE88B_0%,#F6D300_94.88%)] text-[rgb(var(--palette-ink-950))] shadow-cta-glow',
        outline:
          'rounded-pill border border-fg/20 text-fg bg-transparent hover:bg-fg/5',
        ghost:
          'rounded-pill text-fg bg-transparent hover:bg-fg/10',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-5 text-base',
        lg: 'h-14 px-7 text-lg',
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
