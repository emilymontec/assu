import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Badge sobrio: radio chico, sin relleno de color pleno y un punto de
// estado en currentColor para transmitir el tono sin ruido visual.
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-current',
  {
    variants: {
      variant: {
        default: 'border-border bg-muted/60 text-muted-foreground',
        success: 'border-success/25 bg-success/5 text-success',
        warning: 'border-warning/25 bg-warning/5 text-warning',
        danger: 'border-danger/25 bg-danger/5 text-danger',
        accent: 'border-accent/25 bg-accent/5 text-accent',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
