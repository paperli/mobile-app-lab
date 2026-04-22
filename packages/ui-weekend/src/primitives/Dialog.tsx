import { forwardRef } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';

const contentStyles = cva(
  'z-50 text-fg font-sans focus:outline-none',
  {
    variants: {
      variant: {
        plain:
          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-bg-elevated rounded-card shadow-2xl p-8 max-w-lg w-[calc(100vw-2rem)] data-[state=open]:animate-[weekend-scale-in_var(--duration-base)_var(--ease-standard)] data-[state=closed]:animate-[weekend-scale-out_var(--duration-fast)_var(--ease-standard)]',
        backlit:
          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-8 max-w-3xl w-[calc(100vw-2rem)] data-[state=open]:animate-[weekend-scale-in_var(--duration-base)_var(--ease-standard)] data-[state=closed]:animate-[weekend-scale-out_var(--duration-fast)_var(--ease-standard)]',
        fullscreen:
          'fixed inset-0 data-[state=open]:animate-[weekend-fade-in_var(--duration-base)_var(--ease-standard)] data-[state=closed]:animate-[weekend-fade-out_var(--duration-fast)_var(--ease-standard)]',
      },
    },
    defaultVariants: { variant: 'plain' },
  },
);

export interface DialogContentProps
  extends RadixDialog.DialogContentProps,
    VariantProps<typeof contentStyles> {}

const Root = RadixDialog.Root;
const Trigger = RadixDialog.Trigger;
const Portal = RadixDialog.Portal;
const Title = RadixDialog.Title;
const Description = RadixDialog.Description;
const Close = RadixDialog.Close;

const Overlay = forwardRef<HTMLDivElement, RadixDialog.DialogOverlayProps>(
  ({ className, ...props }, ref) => (
    <RadixDialog.Overlay
      ref={ref}
      className={[
        'fixed inset-0 z-40 bg-black/60 data-[state=open]:animate-[weekend-fade-in_var(--duration-base)_var(--ease-standard)] data-[state=closed]:animate-[weekend-fade-out_var(--duration-fast)_var(--ease-standard)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  ),
);
Overlay.displayName = 'Dialog.Overlay';

const Content = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ variant, className, children, ...props }, ref) => {
    return (
      <RadixDialog.Content
        ref={ref}
        className={[contentStyles({ variant }), className].filter(Boolean).join(' ')}
        {...props}
      >
        {variant === 'backlit' ? (
          <>
            {/* Wash layer — radial gradient wash, heavily blurred */}
            <div
              aria-hidden
              className="absolute inset-0 -z-10 rounded-card"
              style={{
                background:
                  'radial-gradient(circle at 50% 50%, rgb(var(--modal-wash)) 0%, rgb(var(--modal-wash-2)) 80%)',
                filter: 'blur(64px)',
                opacity: 0.5,
              }}
            />
            {/* Stroke layer — cyan 4px ring, lightly blurred */}
            <div
              aria-hidden
              className="absolute -inset-[2px] -z-10 rounded-card"
              style={{
                border: '4px solid rgb(var(--modal-tint))',
                filter: 'blur(6px)',
                opacity: 0.75,
              }}
            />
            {/* Solid content panel */}
            <div className="relative rounded-card bg-bg-elevated/90 backdrop-blur-sm p-6">
              {children}
            </div>
          </>
        ) : (
          children
        )}
      </RadixDialog.Content>
    );
  },
);
Content.displayName = 'Dialog.Content';

export const Dialog = {
  Root,
  Trigger,
  Portal,
  Overlay,
  Content,
  Title,
  Description,
  Close,
};
