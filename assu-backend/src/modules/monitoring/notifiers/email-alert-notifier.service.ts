import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlertNotifierPort, AlertToNotify } from '../../../core/ports/alert-notifier.port';
import { EMAIL_PORT, EmailPort } from '../../../core/ports/email.port';
import { AlertSeverity } from '../../../core/domain/monitoring/alert-severity.enum';

/**
 * Adapter de AlertNotifierPort que avisa a un humano de verdad: manda un
 * correo a los destinatarios de operaciones (MONITORING_ALERT_EMAILS) vía
 * EmailPort. Reutiliza la misma infraestructura de correo que el Portal de
 * Comercios, así que con EMAIL_PROVIDER=smtp el aviso llega a Slack/email
 * a través del proveedor SMTP configurado.
 *
 * Best-effort: si el correo falla (SMTP caído, sin destinatarios), se deja
 * el rastro en el log y se sigue — una alerta que no logra notificar nunca
 * debe tumbar el chequeo que la disparó.
 */
@Injectable()
export class EmailAlertNotifierService implements AlertNotifierPort {
  private readonly logger = new Logger('AlertNotifier');

  constructor(
    @Inject(EMAIL_PORT) private readonly email: EmailPort,
    private readonly configService: ConfigService,
  ) {}

  async notify(alert: AlertToNotify): Promise<void> {
    const line = `[${alert.type}] ${alert.message} (${alert.entityType}${alert.entityId ? `:${alert.entityId}` : ''})`;

    // El log se mantiene SIEMPRE (además del correo): es la línea base de
    // diagnóstico que ya existía con LogAlertNotifierService.
    if (alert.severity === AlertSeverity.CRITICAL) {
      this.logger.error(line);
    } else {
      this.logger.warn(line);
    }

    const recipients = this.configService.get<string[]>('monitoring.alertEmails') ?? [];
    if (recipients.length === 0) {
      this.logger.warn('MONITORING_ALERT_EMAILS no está configurado: la alerta solo quedó en el log.');
      return;
    }

    try {
      await this.email.send({
        to: recipients.join(', '),
        subject: `[Assu][${alert.severity}] ${alert.type}`,
        text: this.buildText(alert),
        html: this.buildHtml(alert),
      });
    } catch (err) {
      this.logger.error(`No se pudo enviar la alerta por correo (${alert.type}): ${err}`);
    }
  }

  private buildText(alert: AlertToNotify): string {
    return [
      `Severidad: ${alert.severity}`,
      `Tipo: ${alert.type}`,
      `Entidad: ${alert.entityType}${alert.entityId ? `:${alert.entityId}` : ''}`,
      '',
      alert.message,
      alert.metadata ? `\nMetadata:\n${JSON.stringify(alert.metadata, null, 2)}` : '',
    ].join('\n');
  }

  private buildHtml(alert: AlertToNotify): string {
    const metadata = alert.metadata
      ? `<pre style="background:#f5f5f5;padding:8px;border-radius:4px;overflow:auto">${escapeHtml(
          JSON.stringify(alert.metadata, null, 2),
        )}</pre>`
      : '';
    return [
      `<p><strong>Severidad:</strong> ${escapeHtml(alert.severity)}</p>`,
      `<p><strong>Tipo:</strong> ${escapeHtml(alert.type)}</p>`,
      `<p><strong>Entidad:</strong> ${escapeHtml(alert.entityType)}${alert.entityId ? `:${escapeHtml(alert.entityId)}` : ''}</p>`,
      `<p>${escapeHtml(alert.message)}</p>`,
      metadata,
    ].join('');
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
