import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlertRepository, FindAlertsFilters } from './repositories/alert.repository';
import { ALERT_NOTIFIER_PORT, AlertNotifierPort } from '../../core/ports/alert-notifier.port';
import { Alert } from '../../core/domain/monitoring/alert.entity';
import { AlertType } from '../../core/domain/monitoring/alert-type.enum';
import { AlertSeverity } from '../../core/domain/monitoring/alert-severity.enum';

export interface RaiseAlertInput {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Cubre el módulo 22 del roadmap (Monitoring & Alerts). MonitoringService
 * decide CUÁNDO hay un problema; AlertService decide qué hacer con esa
 * alerta: aplicar cooldown, persistirla (para `GET /alerts` y para que
 * Admin/Operations pueda revisar el historial) y notificarla vía el
 * `AlertNotifierPort` que corresponda.
 *
 * Mismo principio que AuditService/MetricsService: si algo falla acá
 * (Postgres lento, notifier caído), NUNCA debe tumbar el chequeo que la
 * disparó — se registra el error y se sigue.
 */
@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    private readonly repository: AlertRepository,
    @Inject(ALERT_NOTIFIER_PORT) private readonly notifier: AlertNotifierPort,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Cubre TODAS las variantes de "alertar X" del roadmap. Aplica cooldown
   * por (type, entityId): si la MISMA alerta para la MISMA entidad ya se
   * disparó hace menos de `cooldownMinutes`, no se repite — evita que una
   * cuenta caída genere una alerta nueva cada 5 minutos indefinidamente.
   */
  async raise(input: RaiseAlertInput): Promise<void> {
    try {
      const entityId = input.entityId ?? null;
      const cooldownMinutes = this.configService.get<number>('monitoring.cooldownMinutes') ?? 60;

      const latest = await this.repository.findLatest(input.type, entityId);
      if (latest) {
        const minutesSinceLast = (Date.now() - latest.createdAt.getTime()) / 60_000;
        if (minutesSinceLast < cooldownMinutes) {
          return; // todavía en cooldown: ya se avisó de esto hace poco
        }
      }

      await this.repository.create({
        type: input.type,
        severity: input.severity,
        message: input.message,
        entityType: input.entityType,
        entityId,
        metadata: input.metadata ?? null,
      });

      await this.notifier.notify({
        type: input.type,
        severity: input.severity,
        message: input.message,
        entityType: input.entityType,
        entityId,
        metadata: input.metadata,
      });
    } catch (err) {
      this.logger.error(`No se pudo procesar la alerta (${input.type} / ${input.entityType}:${input.entityId ?? '-'}): ${err}`);
    }
  }

  /** Cubre "revisar errores/alertas" para Admin/Operations (módulo 23). */
  async findMany(filters: FindAlertsFilters = {}): Promise<Alert[]> {
    return this.repository.findMany(filters);
  }
}
