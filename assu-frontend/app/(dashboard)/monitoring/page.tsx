'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { NotImplementedYet } from '@/components/not-implemented-yet';
import { api } from '@/lib/api-client';
import type { Alert, AuditLog } from '@/lib/types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

const SEVERITY_VARIANT: Record<Alert['severity'], 'warning' | 'danger'> = {
  WARNING: 'warning',
  CRITICAL: 'danger',
};

const AUDIT_RESULT_VARIANT: Record<AuditLog['result'], 'success' | 'danger'> = {
  SUCCESS: 'success',
  FAILURE: 'danger',
};

/**
 * Cubre "revisar errores" y "revisar logs" de Admin/Operations (módulo
 * 23): junta las dos fuentes de verdad operativa que ya expone el
 * backend — Monitoring & Alerts (módulo 22) para problemas detectados
 * automáticamente, y Audit (módulo 16) para el rastro de qué pasó y
 * quién/qué lo disparó.
 */
export default function MonitoringPage() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[] | null>(null);
  const [alertsNotImplemented, setAlertsNotImplemented] = useState(false);
  const [auditNotImplemented, setAuditNotImplemented] = useState(false);

  useEffect(() => {
    api.alerts
      .list()
      .then((res) => setAlerts(res as Alert[]))
      .catch(() => setAlertsNotImplemented(true));

    api.auditLogs
      .list()
      .then((res) => setAuditLogs(res as AuditLog[]))
      .catch(() => setAuditNotImplemented(true));
  }, []);

  return (
    <>
      <PageHeader
        title="Monitoreo"
        description="Alertas operativas y auditoría de operaciones sensibles de Assu."
      />

      <div className="mb-6">
        <h2 className="mb-2 text-sm font-medium">Alertas recientes</h2>
        {alertsNotImplemented && <NotImplementedYet endpoint="GET /alerts" module="Monitoring & Alerts" />}
        {alerts && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cuándo</TableHead>
                <TableHead>Severidad</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Mensaje</TableHead>
                <TableHead>Entidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Sin alertas registradas — todo tranquilo.
                  </TableCell>
                </TableRow>
              )}
              {alerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell className="text-muted-foreground">{formatDate(alert.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant={SEVERITY_VARIANT[alert.severity]}>{alert.severity}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{alert.type}</TableCell>
                  <TableCell>{alert.message}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {alert.entityType}
                    {alert.entityId ? `:${alert.entityId}` : ''}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium">Auditoría reciente</h2>
        {auditNotImplemented && <NotImplementedYet endpoint="GET /audit-logs" module="Audit" />}
        {auditLogs && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cuándo</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Entidad</TableHead>
                <TableHead>Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Sin registros de auditoría todavía.
                  </TableCell>
                </TableRow>
              )}
              {auditLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground">{formatDate(log.createdAt)}</TableCell>
                  <TableCell className="font-mono text-xs">{log.action}</TableCell>
                  <TableCell className="text-muted-foreground">{log.actor}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {log.entityType}
                    {log.entityId ? `:${log.entityId}` : ''}
                  </TableCell>
                  <TableCell>
                    <Badge variant={AUDIT_RESULT_VARIANT[log.result]}>{log.result}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}
