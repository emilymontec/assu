'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  api,
  ApiError,
  MerchantDto,
  NotificationDto,
  PendingApprovalDto,
} from '@/lib/api-client';

export default function PortalHomePage() {
  const [merchant, setMerchant] = useState<MerchantDto | null>(null);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApprovalDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [me, notifs, approvals] = await Promise.all([api.me(), api.notifications.list(), api.pendingApprovals()]);
      setMerchant(me);
      setNotifications(notifs);
      setPendingApprovals(approvals);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar la información de tu cuenta.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Las aprobaciones pendientes son sensibles al tiempo: se refrescan solas
    // para que el prompt "¿eres tú?" aparezca sin que el comercio recargue.
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleApprove(id: string) {
    await api.approve(id);
    setPendingApprovals((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleDeny(id: string) {
    await api.deny(id);
    setPendingApprovals((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleMarkRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await api.notifications.markRead(id);
    } catch {
      load();
    }
  }

  if (loading) {
    return <p className="text-[13px] text-muted-foreground">Cargando tu cuenta…</p>;
  }

  if (error) {
    return <p className="text-[13px] text-danger">{error}</p>;
  }

  return (
    <div className="space-y-6">
      {merchant && (
        <Card>
          <CardHeader>
            <CardTitle>Mi cuenta</CardTitle>
            <StatusBadge status={merchant.status} />
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-[13px]">
            <InfoRow label="Nombre" value={merchant.fullName} />
            <InfoRow label="Correo" value={merchant.email} />
            <InfoRow label="Documento" value={`${merchant.documentType} ${merchant.documentNumber}`} />
            <InfoRow label="Teléfono" value={merchant.phone} />
          </CardContent>
        </Card>
      )}

      {pendingApprovals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>¿Eres tú? · Inicios de sesión por aprobar</CardTitle>
            <Badge variant="warning">{pendingApprovals.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingApprovals.map((approval) => (
              <div key={approval.id} className="flex items-center justify-between rounded-md border border-border-light px-3 py-2">
                <div>
                  <p className="text-[13px] font-medium text-foreground">{approval.newDeviceLabel}</p>
                  <p className="text-[11px] text-muted-foreground">Solicitado el {formatDate(approval.createdAt)}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleDeny(approval.id)}>
                    No fui yo
                  </Button>
                  <Button size="sm" onClick={() => handleApprove(approval.id)}>
                    Sí, soy yo
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Notificaciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {notifications.length === 0 && <p className="py-4 text-center text-[13px] text-muted-foreground">Sin notificaciones por ahora.</p>}
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.read && handleMarkRead(n.id)}
              className={`flex w-full items-start justify-between gap-3 rounded-md px-3 py-2.5 text-left transition-colors duration-150 ${n.read ? '' : 'bg-accent/5'} hover:bg-surface-2`}
            >
              <div>
                <p className="text-[13px] text-foreground">{n.message}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{formatDate(n.createdAt)}</p>
              </div>
              {!n.read && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-foreground">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: MerchantDto['status'] }) {
  if (status === 'ACTIVE') return <Badge variant="success">Activa</Badge>;
  if (status === 'SUSPENDED') return <Badge variant="danger">Suspendida</Badge>;
  return <Badge variant="warning">Verificación pendiente</Badge>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}
