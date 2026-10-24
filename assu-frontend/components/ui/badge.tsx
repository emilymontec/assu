import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Pill badge con un punto de "estado" en currentColor, al estilo
// .badge/.pill-badge de la plantilla Editorial Bento (radio completo,
// tipografía chica y pesada, antes que un tag rectangular).
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-current before:opacity-70',
  {
    variants: {
      variant: {
        default: 'bg-muted text-muted-foreground',
        success: 'bg-success/10 text-success',
        warning: 'bg-warning/10 text-warning',
        danger: 'bg-danger/10 text-danger',
        accent: 'bg-accent/10 text-accent',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
