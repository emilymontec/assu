import { AlertCircle } from 'lucide-react';

interface NotImplementedYetProps {
  endpoint: string;
  module: string;
}

// Estado vacío "bento": ícono en un chip redondeado dentro de una
// tarjeta con radio grande — mismo lenguaje que .empty-state/.empty-icon
// de la plantilla, en vez del recuadro punteado chato de antes.
export function NotImplementedYet({ endpoint, module }: NotImplementedYetProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-bento border border-dashed border-border bg-surface-2 px-8 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <AlertCircle className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-semibold text-foreground">Este endpoint todavía no existe en el backend</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        Esta vista consumirá <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono">{endpoint}</code> en
        cuanto el módulo <strong className="font-medium text-foreground">{module}</strong> se implemente en
        Assu.
      </p>
    </div>
  );
}
