import { Injectable, Logger } from '@nestjs/common';
import { AlertNotifierPort, AlertToNotify } from '../../../core/ports/alert-notifier.port';
import { AlertSeverity } from '../../../core/domain/monitoring/alert-severity.enum';

/**
 * Adapter MVP: deja la alerta en los logs (Pino ya los estructura y los
 * puede enviar a cualquier lado — Datadog, CloudWatch, etc.). Suficiente
 * para operar hoy; el día que haya un canal humano real (Slack, PagerDuty),
 * se agrega OTRO adapter y se cambia el `provide` en MonitoringModule —
 * AlertService no se toca.
 */
@Injectable()
export class LogAlertNotifierService implements AlertNotifierPort {
  private readonly logger = new Logger('AlertNotifier');

  async notify(alert: AlertToNotify): Promise<void> {
    const line = `[${alert.type}] ${alert.message} (${alert.entityType}${alert.entityId ? `:${alert.entityId}` : ''})`;
    if (alert.severity === AlertSeverity.CRITICAL) {
      this.logger.error(line);
    } else {
      this.logger.warn(line);
    }
  }
}
