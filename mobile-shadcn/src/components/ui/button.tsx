import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:   'bg-zinc-900 text-white hover:bg-zinc-800',
        outline:   'border border-zinc-200 bg-white hover:bg-zinc-50',
        ghost:     'hover:bg-zinc-100',
        secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm:      'h-8 px-3 text-xs',
        lg:      'h-12 px-6 text-base',
        icon:    'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

export function Button({ className, variant, size, asChild, isLoading, children, disabled, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp className={cn(buttonVariants({ variant, size }), 'w-full', className)} disabled={disabled || isLoading} {...props}>
      {isLoading ? <span className="animate-spin">⟳</span> : children}
    </Comp>
  );
}
