import * as React from 'react';
import { cn } from '@/lib/utils';

// Tarjeta "bento": radio grande (24px), sombra larga y difusa en vez del
// borde chato + sin sombra de antes — con un leve levantamiento al hover
// como en las .card/.dash-card de la plantilla Editorial Bento.
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-bento border border-border bg-card shadow-bento transition-shadow duration-200 hover:shadow-bento-hover',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-between gap-3 border-b border-border-light px-5 py-4', className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-sm font-semibold tracking-tight text-foreground', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />;
}
