'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { api, ApiError, VerificationDto, VerificationEventDto, VerificationStatus } from '@/lib/api-client';

const STATUS_FILTERS: { value: VerificationStatus | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'VERIFIED', label: 'Verificados' },
  { value: 'PENDING_MOVEMENT', label: 'Esperando movimiento' },
  { value: 'MANUAL_REVIEW', label: 'En revisión manual' },
  { value: 'AMBIGUOUS', label: 'Ambiguos' },
  { value: 'REJECTED', label: 'Rechazados' },
  { value: 'ERROR', label: 'Con error técnico' },
];

export default function VerificationsPage() {
  const [submissions, setSubmissions] = useState<VerificationDto[]>([]);
  const [status, setStatus] = useState<VerificationStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [events, setEvents] = useState<Record<string, VerificationEventDto[]>>({});

  const load = useCallback(async (nextStatus: VerificationStatus | '') => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.verifications.list(nextStatus || undefined);
      setSubmissions(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los comprobantes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(status);
  }, [load, status]);

  async function toggleDetail(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!events[id]) {
      try {
        const history = await api.verifications.events(id);
        setEvents((prev) => ({ ...prev, [id]: history }));
      } catch {
        setEvents((prev) => ({ ...prev, [id]: [] }));
      }
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Comprobantes recibidos</CardTitle>
          <div className="w-56">
            <Select value={status} onChange={(e) => setStatus(e.target.value as VerificationStatus | '')}>
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="py-4 text-center text-[13px] text-muted-foreground">Cargando comprobantes…</p>}
          {error && <p className="py-4 text-center text-[13px] text-danger">{error}</p>}
          {!loading && !error && submissions.length === 0 && (
            <p className="py-4 text-center text-[13px] text-muted-foreground">
              Todavía no hay comprobantes para este filtro.
            </p>
          )}

          {submissions.map((s) => (
            <div key={s.id} className="rounded-md border border-border-light">
              <button
                onClick={() => toggleDetail(s.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-surface-2"
              >
                <div>
                  <p className="text-[13px] font-medium text-foreground">Comprobante {s.id.slice(0, 8)}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Recibido el {formatDate(s.createdAt)} · Canal {s.channel}
                  </p>
                </div>
                <StatusBadge status={s.status} />
              </button>

              {expandedId === s.id && (
                <div className="space-y-4 border-t border-border-light px-4 py-4">
                  <div className="grid grid-cols-2 gap-4 text-[13px]">
                    <InfoRow label="Última actualización" value={formatDate(s.updatedAt)} />
                    <InfoRow label="Confianza OCR" value={s.ocrConfidence ?? '—'} />
                    <InfoRow label="Resultado de conciliación" value={s.matchResult ?? '—'} />
                    <InfoRow label="Puntaje de coincidencia" value={s.matchScore !== null ? String(s.matchScore) : '—'} />
                  </div>

                  {s.rejectionReason && (
                    <p className="rounded-md border border-danger/25 bg-danger/5 px-3 py-2 text-[12px] text-danger">
                      {s.rejectionReason}
                    </p>
                  )}

                  <div>
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Historial
                    </p>
                    <ol className="space-y-2">
                      {(events[s.id] ?? []).map((event) => (
                        <li key={event.id} className="flex items-start gap-3 text-[12px]">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                          <div>
                            <p className="text-foreground">
                              {event.fromStatus ? `${statusLabel(event.fromStatus)} → ` : ''}
                              {statusLabel(event.toStatus)}
                            </p>
                            {event.reason && <p className="text-muted-foreground">{event.reason}</p>}
                            <p className="text-[11px] text-muted-foreground">
                              {formatDate(event.createdAt)} · {event.actor}
                            </p>
                          </div>
                        </li>
                      ))}
                      {events[s.id]?.length === 0 && (
                        <li className="text-[12px] text-muted-foreground">Sin eventos registrados.</li>
                      )}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Button variant="outline" size="sm" onClick={() => load(status)}>
        Actualizar
      </Button>
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

function StatusBadge({ status }: { status: VerificationStatus }) {
  if (status === 'VERIFIED') return <Badge variant="success">Verificado</Badge>;
  if (status === 'REJECTED') return <Badge variant="danger">Rechazado</Badge>;
  if (status === 'ERROR') return <Badge variant="danger">Error técnico</Badge>;
  if (status === 'MANUAL_REVIEW' || status === 'AMBIGUOUS') return <Badge variant="warning">Requiere revisión</Badge>;
  return <Badge variant="default">En proceso</Badge>;
}

function statusLabel(status: VerificationStatus): string {
  return {
    RECEIVED: 'Recibido',
    PROCESSING: 'Procesando',
    PENDING_MOVEMENT: 'Esperando movimiento',
    MATCHING: 'Conciliando',
    VERIFIED: 'Verificado',
    REJECTED: 'Rechazado',
    AMBIGUOUS: 'Ambiguo',
    ERROR: 'Error técnico',
    MANUAL_REVIEW: 'Revisión manual',
  }[status];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}
