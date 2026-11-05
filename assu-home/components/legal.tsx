import Link from 'next/link';
import { Logo } from '@/components/logo';
import { LEGAL, LEGAL_DOCS } from '@/lib/legal';

interface LegalShellProps {
  title: string;
  intro?: string;
  /** Ruta actual, para resaltarla en la navegación entre documentos. */
  currentPath: string;
  children: React.ReactNode;
}

/**
 * Contenedor común de todas las páginas legales: encabezado con el logo,
 * título del documento, fecha de actualización, el cuerpo redactado por la
 * página y una navegación cruzada a los demás documentos. Mantiene la misma
 * paleta y tipografía que la landing (tokens de assu-ui) sin inventar un
 * estilo nuevo para el contenido legal.
 */
export function LegalShell({ title, intro, currentPath, children }: LegalShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border-light">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/" aria-label="Assu — inicio">
            <Logo compact surface="light" />
          </Link>
          <Link href="/" className="text-[13px] font-medium text-muted-foreground hover:text-foreground">
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Documento legal</p>
        <h1 className="mt-2 font-display text-[30px] leading-tight text-foreground md:text-[34px]">{title}</h1>
        <p className="mt-3 text-[13px] text-muted-foreground">Última actualización: {LEGAL.lastUpdated}</p>
        {intro && <p className="mt-6 text-[14px] leading-relaxed text-foreground/80">{intro}</p>}

        <article className="mt-10 space-y-8">{children}</article>

        <ResponsableBlock />

        <LegalDocNav currentPath={currentPath} />

        <div className="mt-10 border-t border-border-light pt-6 text-[12px] text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            ← Volver a la página principal
          </Link>
        </div>
      </main>
    </div>
  );
}

/** Identificación del responsable del tratamiento (Ley 1581, art. 13). */
export function ResponsableBlock() {
  return (
    <section className="mt-12 rounded-bento border border-dashed border-border bg-surface-2 p-5">
      <h2 className="text-[13px] font-semibold text-foreground">Responsable del tratamiento</h2>
      <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-[12px] text-muted-foreground sm:grid-cols-2">
        <Detail label="Razón social" value={LEGAL.entity} />
        <Detail label="NIT" value={LEGAL.nit} />
        <Detail label="Dirección" value={LEGAL.address} />
        <Detail label="Correo de privacidad" value={LEGAL.privacyEmail} />
        <Detail label="Teléfono" value={LEGAL.phone} />
        <Detail label="País" value={LEGAL.country} />
      </dl>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Los campos entre corchetes deben completarse antes de publicar. Autoridad de control:{' '}
        <a href={LEGAL.sicUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
          {LEGAL.sicName}
        </a>
        .
      </p>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-muted-foreground">{label}:</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}

function LegalDocNav({ currentPath }: { currentPath: string }) {
  return (
    <nav className="mt-12 border-t border-border-light pt-6" aria-label="Otros documentos legales">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Otros documentos</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {LEGAL_DOCS.filter((doc) => doc.href !== currentPath).map((doc) => (
          <li key={doc.href}>
            <Link
              href={doc.href}
              className="block rounded-md border border-border bg-card px-3 py-2 text-[13px] font-medium text-foreground transition-colors duration-150 hover:bg-surface-2"
            >
              {doc.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ── Bloques de contenido reutilizables ─────────────────────────────── */

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-[13px] leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/** Bloque con los nombres de las partes/finalidades en columnas. */
export function LegalTable({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="divide-y divide-border-light rounded-bento border border-border">
      {rows.map((row, i) => (
        <div key={i} className="grid gap-1 px-4 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
          <dt className="text-[12px] font-medium text-foreground">{row.label}</dt>
          <dd className="text-[13px] leading-relaxed text-muted-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
