import { AlertCircle } from 'lucide-react';

interface NotImplementedYetProps {
  endpoint: string;
  module: string;
}

export function NotImplementedYet({ endpoint, module }: NotImplementedYetProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
      <AlertCircle className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
      <p className="text-sm font-medium">Este endpoint todavía no existe en el backend</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        Esta vista consumirá <code className="rounded bg-muted px-1 py-0.5">{endpoint}</code> en cuanto
        el módulo <strong className="font-medium text-foreground">{module}</strong> se implemente en el
        Collector.
      </p>
    </div>
  );
}
