'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { SyncStatusBadge } from '@/components/status-badge';
import { NotImplementedYet } from '@/components/not-implemented-yet';
import { api } from '@/lib/api-client';
import type { SyncLog } from '@/lib/types';

export default function SyncLogsPage() {
  const [logs, setLogs] = useState<SyncLog[] | null>(null);
  const [notImplemented, setNotImplemented] = useState(false);

  useEffect(() => {
    api
      .syncLogs.list()
      .then((res) => setLogs(res as SyncLog[]))
      .catch(() => setNotImplemented(true));
  }, []);

  return (
    <>
      <PageHeader
        title="Historial de sincronización"
        description="Registro de cada intento de sync por cuenta: duración, resultado y errores."
      />

      {notImplemented && <NotImplementedYet endpoint="GET /sync-logs" module="Sync Log" />}

      {logs && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cuenta</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Duración</TableHead>
              <TableHead>Movimientos nuevos</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-mono text-xs">{log.accountId}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(log.startedAt).toLocaleString('es-CO')}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : '—'}
                </TableCell>
                <TableCell>{log.movementsNew}</TableCell>
                <TableCell>
                  <SyncStatusBadge status={log.status} />
                </TableCell>
                <TableCell className="max-w-xs truncate text-xs text-danger">{log.error ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
