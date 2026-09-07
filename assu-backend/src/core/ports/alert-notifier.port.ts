import { AlertType } from '../domain/monitoring/alert-type.enum';
import { AlertSeverity } from '../domain/monitoring/alert-severity.enum';

export const ALERT_NOTIFIER_PORT = Symbol('ALERT_NOTIFIER_PORT');

export interface AlertToNotify {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  entityType: string;
  entityId: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Igual que EventPublisherPort: el dominio (MonitoringService/AlertService)
 * no sabe NI le importa a dónde termina yendo la notificación. Hoy hay un
 * único adapter (log), pero cambiar a Slack/PagerDuty/email/webhook el
 * día de mañana es agregar una clase nueva — cero cambios en quien
 * dispara la alerta.
 */
export interface AlertNotifierPort {
  notify(alert: AlertToNotify): Promise<void>;
}
