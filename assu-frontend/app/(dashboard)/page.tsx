'use client';

import { useEffect, useState } from 'react';
import { Activity, Landmark, ShieldAlert, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api, ApiError } from '@/lib/api-client';
import type { SystemStatus } from '@/lib/types';

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  tone?: 'danger';
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-md ${tone === 'danger' ? 'bg-danger/10' : 'bg-muted'}`}
        >
          <Icon
            className={`h-4 w-4 ${tone === 'danger' ? 'text-danger' : 'text-muted-foreground'}`}
            strokeWidth={1.75}
          />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium">{value}</p>
        </div>
      </CardContent>
    </Card>
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

  return (
    <>
      <PageHeader
        title="Resumen"
        description="Estado general de Assu: bancos, cuentas y necesidad de atención operativa."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          label="Bancos activos"
          value={status ? `${status.banks.ACTIVE}/${status.banks.total}` : '—'}
          icon={Landmark}
        />
        <MetricCard
          label="Cuentas activas"
          value={status ? `${status.accounts.ACTIVE}/${status.accounts.total}` : '—'}
          icon={Wallet}
        />
        <MetricCard
          label="Requieren reconexión"
          value={status ? String(status.accountsNeedingReconnection) : '—'}
          icon={ShieldAlert}
          tone={status && status.accountsNeedingReconnection > 0 ? 'danger' : undefined}
        />
        <MetricCard label="Cuentas en error" value={status ? String(status.accounts.ERROR) : '—'} icon={Activity} />
      </div>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Estado del sistema</p>
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
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              No se pudo conectar con <code className="rounded bg-background px-1">ASSU_BACKEND_API_URL</code>.
              Verifica que el backend esté corriendo (<code className="rounded bg-background px-1">npm run start:dev</code>{' '}
              en <code className="rounded bg-background px-1">assu-backend/</code>) y que{' '}
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
    </>
  );
}
