import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

// Encabezado plano: título en Folty Bold con tracking apretado y una
// descripción breve, separados del contenido por un hairline. Sin
// adornos: la jerarquía la da el tamaño, no el color ni la sombra.
export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border-light pb-5',
        className,
      )}
    >
      <div>
        <h1 className="font-display text-[1.5rem] leading-tight tracking-tight text-foreground sm:text-[1.85rem]">
          {title}
        </h1>
        {description && <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-3">{action}</div>}
    </div>
  );
}
