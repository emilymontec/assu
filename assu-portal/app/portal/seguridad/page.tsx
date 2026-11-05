'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, ApiError, TrustedDeviceDto } from '@/lib/api-client';

export default function SecurityPage() {
  const [devices, setDevices] = useState<TrustedDeviceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setDevices(await api.devices.list());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar tus dispositivos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRevoke(id: string) {
    setRevoking(id);
    setError(null);
    try {
      await api.devices.revoke(id);
      setDevices((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo revocar el dispositivo.');
    } finally {
      setRevoking(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dispositivos de confianza</CardTitle>
          <Badge variant="default">{devices.length}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-[12px] text-muted-foreground">
            Estos dispositivos pueden iniciar sesión sin pedir el código por correo. Si revocas uno, el próximo acceso
            desde él volverá a pedir verificación.
          </p>

          {loading && <p className="py-4 text-center text-[13px] text-muted-foreground">Cargando dispositivos…</p>}
          {error && <p className="text-[13px] text-danger">{error}</p>}
          {!loading && devices.length === 0 && (
            <p className="py-4 text-center text-[13px] text-muted-foreground">No tienes dispositivos de confianza.</p>
          )}

          {devices.map((device) => (
            <div
              key={device.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border-light px-3 py-2"
            >
              <div>
                <p className="text-[13px] font-medium text-foreground">{device.label}</p>
                <p className="text-[11px] text-muted-foreground">
                  Último uso: {formatDate(device.lastUsedAt)} · Agregado: {formatDate(device.createdAt)}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={revoking === device.id}
                onClick={() => handleRevoke(device.id)}
              >
                {revoking === device.id ? 'Revocando…' : 'Revocar'}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}
