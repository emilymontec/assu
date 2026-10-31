import { Logo } from '@/components/logo';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Ancho de la tarjeta — los formularios de varios pasos (registro) necesitan más espacio que login. */
  wide?: boolean;
}

/**
 * Layout compartido por /login, /registro y /verificar: riel superior con
 * el wordmark y una tarjeta centrada, manteniendo la misma paleta blanca +
 * teal del panel admin (ver app/globals.css), sin reinventar un estilo
 * nuevo solo porque es un flujo "público".
 */
export function AuthShell({ title, subtitle, children, wide = false }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-surface-2 px-4 py-10">
      <div className="mb-8">
        <Logo surface="light" />
      </div>
      <div className={`w-full ${wide ? 'max-w-lg' : 'max-w-sm'} rounded-bento border border-border bg-card p-6 shadow-bento`}>
        <div className="mb-6">
          <h1 className="font-display text-lg text-foreground">{title}</h1>
          {subtitle && <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
