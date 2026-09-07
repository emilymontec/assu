import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  /** Oculta el tagline — útil en contextos muy compactos. */
  compact?: boolean;
  /** Color del tagline: 'dark' para fondos oscuros (riel lateral), 'light' para fondos claros. */
  surface?: 'dark' | 'light';
}

/**
 * Wordmark de marca. El script (Pacifico, cargado en app/layout.tsx)
 * se usa ÚNICAMENTE acá — nunca en texto de interfaz, tablas o botones,
 * donde la legibilidad importa más que la personalidad de marca.
 */
export function Logo({ className, compact = false, surface = 'dark' }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-accent">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
          <path
            d="M5 12.5L9.5 17L19 6.5"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <div className="leading-none">
        <span className="font-script text-2xl leading-none text-accent">Assu</span>
        {!compact && (
          <p className={cn('mt-0.5 text-[11px] leading-none', surface === 'dark' ? 'text-white/45' : 'text-muted-foreground')}>
            Verificación de Movimientos
          </p>
        )}
      </div>
    </div>
  );
}
