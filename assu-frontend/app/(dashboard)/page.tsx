'use client';

import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, Landmark, ShieldAlert, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api, ApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { SystemStatus } from '@/lib/types';

/**
 * Tile "bento" de soporte: ícono en chip + valor grande + nota — la
 * variante de MetricCard de antes, reescrita al lenguaje visual de la
 * plantilla Editorial Bento (radio 24px, sombra larga, levantamiento al
 * hover) pero con los mismos datos de SystemStatus.
 */
function KpiTile({
  label,
  value,
  icon: Icon,
  note,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  note?: string;
  tone?: 'danger' | 'accent';
}) {
  return (
    <div className="flex h-full flex-col gap-4 rounded-bento border border-border bg-card p-5 shadow-bento transition-all duration-200 hover:-translate-y-0.5 hover:shadow-bento-hover">
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-xl',
          tone === 'danger'
            ? 'bg-danger/10 text-danger'
            : tone === 'accent'
              ? 'bg-accent/10 text-accent'
              : 'bg-muted text-muted-foreground',
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-[28px] font-extrabold leading-none tracking-tight text-foreground">{value}</p>
      </div>
      {note && <p className="mt-auto text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

export default function OverviewPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.status
      .get()
      .then((res) => setStatus(res as SystemStatus))
      .catch((err: ApiError) => setError(err.message));
  }, []);

  const isOk = status?.status === 'ok';

  return (
    <>
      <PageHeader
        title="Resumen"
        description="Estado general de Assu: bancos, cuentas y necesidad de atención operativa."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-12">
        {/* Hero tile — estado general del sistema, la única superficie
            oscura "bento" fuera del riel lateral. */}
        <div className="relative overflow-hidden rounded-2xl bg-ink p-8 text-white shadow-bento sm:col-span-7">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              maskImage: 'linear-gradient(120deg, #000 0%, transparent 60%)',
              WebkitMaskImage: 'linear-gradient(120deg, #000 0%, transparent 60%)',
            }}
          />
          <div className="relative flex items-center gap-2">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                !status && !error && 'bg-white/30',
                status && isOk && 'bg-accent',
                status && !isOk && 'bg-warning',
                error && 'bg-danger',
              )}
            />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-white/60">
              {error ? 'Sin conexión con el backend' : status ? (isOk ? 'Sistema operativo' : 'Sistema degradado') : 'Consultando estado…'}
            </span>
          </div>

          <p className="relative mt-6 text-[2.5rem] font-extrabold leading-none tracking-tight sm:text-[3.1rem]">
            {status ? `${status.accounts.ACTIVE}/${status.accounts.total}` : '—'}
          </p>
          <p className="relative mt-2 max-w-sm text-sm leading-relaxed text-white/55">
            cuentas bancarias activas, de un total de {status ? status.accounts.total : '—'} conectadas a Assu.
          </p>

          <div className="relative mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/10 pt-5 text-[11px] font-medium text-white/45">
            <span>GET /status</span>
            <span>{status ? new Date(status.timestamp).toLocaleString('es-CO') : 'esperando datos'}</span>
          </div>
        </div>

        {/* Highlight tile — cuentas que requieren reconexión, en el teal
            de marca a pantalla completa (el acento "bento" del dashboard). */}
        <div className="relative flex flex-col overflow-hidden rounded-2xl bg-accent p-7 text-white shadow-bento sm:col-span-5">
          <ShieldAlert className="h-5 w-5 text-white/70" strokeWidth={1.75} />
          <p className="mt-5 text-5xl font-extrabold leading-none tracking-tight">
            {status ? status.accountsNeedingReconnection : '—'}
          </p>
          <h3 className="mt-3 text-base font-bold">Cuentas requieren reconexión</h3>
          <p className="mt-1 text-xs leading-relaxed text-white/75">
            Credenciales vencidas o sesión inválida — revisa Cuentas bancarias para reconectarlas.
          </p>
        </div>

        {/* KPI tiles de soporte, con los mismos datos que antes mostraba
            la grilla 2x4 de MetricCard. */}
        <div className="sm:col-span-3">
          <KpiTile
            label="Bancos activos"
            value={status ? `${status.banks.ACTIVE}/${status.banks.total}` : '—'}
            icon={Landmark}
          />
        </div>
        <div className="sm:col-span-3">
          <KpiTile
            label="Cuentas activas"
            value={status ? `${status.accounts.ACTIVE}/${status.accounts.total}` : '—'}
            icon={Wallet}
            tone="accent"
          />
        </div>
        <div className="sm:col-span-3">
          <KpiTile
            label="Cuentas en error"
            value={status ? String(status.accounts.ERROR) : '—'}
            icon={Activity}
            tone={status && status.accounts.ERROR > 0 ? 'danger' : undefined}
          />
        </div>
        <div className="sm:col-span-3">
          <KpiTile
            label="Pendientes de 1er sync"
            value={status ? String(status.accounts.PENDING) : '—'}
            icon={CheckCircle2}
          />
        </div>

        {/* Card ancha con el detalle de estado — misma información e
            iguales mensajes de error que antes, en el nuevo Card bento. */}
        <Card className="sm:col-span-12">
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Estado del sistema</p>
                <p className="text-xs text-muted-foreground">
                  GET /status — agregado de bancos y cuentas por estado
                </p>
              </div>
              {status && (
                <Badge variant={status.status === 'ok' ? 'success' : 'warning'}>
                  {status.status === 'ok' ? 'Operativo' : 'Degradado'}
                </Badge>
              )}
              {error && <Badge variant="danger">No se pudo conectar</Badge>}
            </div>

            {error && (
              <p className="rounded-xl bg-muted px-4 py-3 text-xs text-muted-foreground">
                No se pudo conectar con <code className="rounded bg-background px-1">ASSU_BACKEND_API_URL</code>.
                Verifica que el backend esté corriendo (
                <code className="rounded bg-background px-1">npm run start:dev</code> en{' '}
                <code className="rounded bg-background px-1">assu-backend/</code>) y que{' '}
                <code className="rounded bg-background px-1">.env.local</code> apunte a la URL correcta.
              </p>
            )}

            {status && (
              <p className="text-xs text-muted-foreground">
                {status.accounts.PENDING} cuenta(s) pendiente(s) de primer sync,{' '}
                {status.accounts.SUSPENDED} suspendida(s). Revisa <strong className="text-foreground">Monitoreo</strong>{' '}
                para el detalle de alertas y auditoría.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
