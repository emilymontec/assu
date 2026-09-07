import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

/**
 * Cubre el módulo 21 (Observability) del roadmap: generar métricas,
 * medir tiempos, contabilizar movimientos/errores/reintentos, detectar
 * sesiones expiradas.
 *
 * Mismo principio que AuditService: es un colaborador de "solo escritura"
 * al que otros módulos empujan eventos — MetricsService no importa nada
 * de Bank/BankAccount/Sync Engine, así que se puede inyectar en
 * cualquier módulo sin riesgo de dependencia circular.
 *
 * Diseño deliberado: contadores por evento (incrementados por quien los
 * dispara), NO gauges calculados con queries a la base de datos en cada
 * scrape de Prometheus — eso acoplaría Observability a Bank/BankAccount
 * y potencialmente sobrecargaría Postgres si Prometheus scrapea cada
 * pocos segundos. Un conteo de "cuentas por estado" ya existe como dato
 * de negocio en `GET /status` (módulo 19); si hace falta como serie de
 * tiempo en Grafana, se agrega ahí un exporter dedicado más adelante.
 */
@Injectable()
export class MetricsService {
  private readonly registry = new Registry();

  private readonly syncsTotal = new Counter({
    name: 'collector_syncs_total',
    help: 'Sincronizaciones ejecutadas, por banco y resultado',
    labelNames: ['bank', 'status'] as const,
    registers: [this.registry],
  });

  private readonly syncDurationSeconds = new Histogram({
    name: 'collector_sync_duration_seconds',
    help: 'Duración de una sincronización completa (login → guardar → publicar evento)',
    labelNames: ['bank', 'status'] as const,
    buckets: [0.5, 1, 2, 5, 10, 20, 30, 60, 120],
    registers: [this.registry],
  });

  private readonly movementsSavedTotal = new Counter({
    name: 'collector_movements_saved_total',
    help: 'Movimientos nuevos guardados, por banco',
    labelNames: ['bank'] as const,
    registers: [this.registry],
  });

  private readonly syncErrorsTotal = new Counter({
    name: 'collector_sync_errors_total',
    help: 'Errores de sincronización, por banco y tipo de error',
    labelNames: ['bank', 'errorType'] as const,
    registers: [this.registry],
  });

  private readonly retriesTotal = new Counter({
    name: 'collector_retries_total',
    help: 'Reintentos programados por BullMQ tras un error transitorio',
    registers: [this.registry],
  });

  private readonly expiredSessionsTotal = new Counter({
    name: 'collector_expired_sessions_total',
    help: 'Sesiones detectadas como expiradas al intentar reutilizarlas',
    registers: [this.registry],
  });

  constructor() {
    // process_cpu_*, nodejs_heap_*, etc. — gratis, útiles para saber si
    // el propio Collector es el problema (memory leak, event loop lag).
    collectDefaultMetrics({ register: this.registry });
  }

  /** Cubre "generar métricas" + "medir tiempos" + "monitorizar sincronizaciones". */
  recordSync(bank: string, status: 'SUCCESS' | 'FAILED', durationMs: number): void {
    this.syncsTotal.inc({ bank, status });
    this.syncDurationSeconds.observe({ bank, status }, durationMs / 1000);
  }

  /** Cubre "contabilizar movimientos". */
  recordMovementsSaved(bank: string, count: number): void {
    if (count > 0) {
      this.movementsSavedTotal.inc({ bank }, count);
    }
  }

  /** Cubre "contabilizar errores". */
  recordSyncError(bank: string, errorType: string): void {
    this.syncErrorsTotal.inc({ bank, errorType });
  }

  /** Cubre "contabilizar reintentos". */
  recordRetry(): void {
    this.retriesTotal.inc();
  }

  /** Cubre "detectar sesiones expiradas". */
  recordSessionExpired(): void {
    this.expiredSessionsTotal.inc();
  }

  /** Formato de exposición de Prometheus, listo para `GET /metrics`. */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}
