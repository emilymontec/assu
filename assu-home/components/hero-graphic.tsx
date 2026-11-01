/**
 * Pieza gráfica de la portada: una cinta/lazo torcido, construida con
 * trazos SVG en degradé teal→ink (nunca una foto externa) — referencia
 * visual tomada de la imagen de marca que trajo el usuario (renders 3D
 * en gris sobre fondo oscuro), pero resuelta con la paleta real de Assu
 * en vez del verde ácido/negro puro del ejemplo.
 */
export function HeroGraphic() {
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-bento bg-ink">
      <svg viewBox="0 0 400 500" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="ribbon-a" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38A793" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#38A793" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="ribbon-b" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E8F5F1" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#E8F5F1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M -40 120 C 100 40, 180 220, 340 160 S 520 40, 460 260 S 180 420, 60 340 S -80 460, 80 500"
          fill="none"
          stroke="url(#ribbon-a)"
          strokeWidth="46"
          strokeLinecap="round"
        />
        <path
          d="M -40 160 C 100 80, 180 260, 340 200 S 520 80, 460 300"
          fill="none"
          stroke="url(#ribbon-b)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M 20 440 C 140 380, 220 480, 380 380"
          fill="none"
          stroke="#38A793"
          strokeOpacity="0.35"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      {/* Chip flotante: lo único "dato real" sobre el gráfico — el resto es textura. */}
      <div className="absolute bottom-5 left-5 right-5 flex items-center gap-3 rounded-md border border-white/10 bg-ink-light/90 px-4 py-3 backdrop-blur">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
            <path d="M5 12.5L9.5 17L19 6.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div className="leading-tight">
          <p className="text-[12px] font-medium text-white">Verificación de dos pasos</p>
          <p className="text-[11px] text-white/50">Correo o aprobación desde tu dispositivo</p>
        </div>
      </div>
    </div>
  );
}
