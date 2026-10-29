import { AlertCircle } from 'lucide-react';

interface NotImplementedYetProps {
  endpoint: string;
  module: string;
}

// Estado vacío minimalista: borde punteado, superficie tenue y un ícono
// discreto — sin contenedores elevados.
export function NotImplementedYet({ endpoint, module }: NotImplementedYetProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-bento border border-dashed border-border bg-surface-2 px-8 py-14 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background">
        <AlertCircle className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-medium text-foreground">Este endpoint todavía no existe en el backend</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        Esta vista consumirá <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{endpoint}</code> en
        cuanto el módulo <strong className="font-medium text-foreground">{module}</strong> se implemente en
        Assu.
      </p>
    </div>
  );
}
