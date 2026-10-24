import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

// Encabezado "editorial": título grande en Folty Bold (display) con
// tracking apretado, separado del contenido por un hairline — al estilo
// .page-header/.dash-head de la plantilla Editorial Bento, en vez del
// título chico de antes que casi no usaba la fuente de marca.
export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-border-light pb-6',
        className,
      )}
    >
      <div>
        <h1 className="font-display text-[1.65rem] leading-[1.05] tracking-tight text-foreground sm:text-[2.05rem]">
          {title}
        </h1>
        {description && <p className="mt-2 max-w-xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-3">{action}</div>}
    </div>
  );
}
