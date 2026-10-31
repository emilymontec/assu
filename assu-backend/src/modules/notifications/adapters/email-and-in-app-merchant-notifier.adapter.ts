import { Inject, Injectable, Logger } from '@nestjs/common';
import { MerchantNotification, MerchantNotifierPort } from '../../../core/ports/merchant-notifier.port';
import { EMAIL_PORT, EmailPort } from '../../../core/ports/email.port';
import { NotificationType } from '../../../core/domain/notification/notification-type.enum';
import { NotificationService } from '../notification.service';
import { MerchantService } from '../../merchant/merchant.service';

/**
 * Único adapter de MerchantNotifierPort hoy: persiste la notificación en
 * el centro de notificaciones del Portal (NotificationService) Y manda
 * un correo (EmailPort) — "ambos" canales, como se definió para este
 * módulo. Si el correo falla, la notificación en la app ya quedó
 * guardada (igual que AlertNotifierPort/ReceiptChannelResponderPort: un
 * canal best-effort nunca debe tumbar al que sí es confiable).
 */
@Injectable()
export class EmailAndInAppMerchantNotifierAdapter implements MerchantNotifierPort {
  private readonly logger = new Logger(EmailAndInAppMerchantNotifierAdapter.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly merchantService: MerchantService,
    @Inject(EMAIL_PORT) private readonly email: EmailPort,
  ) {}

  async notify(notification: MerchantNotification): Promise<void> {
    let emailSentAt: Date | null = null;

    try {
      const merchant = await this.merchantService.findById(notification.merchantId);
      await this.email.send({
        to: merchant.email,
        subject: this.subjectFor(notification),
        text: notification.message,
        html: `<p>${notification.message}</p>`,
      });
      emailSentAt = new Date();
    } catch (err) {
      this.logger.warn(
        `No se pudo enviar el correo de notificación (${notification.type}) a comercio ${notification.merchantId}: ${err}`,
      );
    }

    // Se guarda SIEMPRE, haya o no podido enviarse el correo — es el
    // registro que el comercio ve dentro del Portal pase lo que pase.
    await this.notificationService.record(
      notification.merchantId,
      notification.type,
      notification.message,
      notification.metadata,
      emailSentAt,
    );
  }

  private subjectFor(notification: MerchantNotification): string {
    switch (notification.type) {
      case NotificationType.NEW_LOGIN:
        return 'Nuevo inicio de sesión en tu cuenta de Assu';
      case NotificationType.BANK_ACCOUNT_ADDED:
        return 'Agregaste una cuenta bancaria nueva en Assu';
      case NotificationType.BANK_ACCOUNT_REMOVED:
        return 'Se eliminó una cuenta bancaria en Assu';
      default:
        return 'Notificación de Assu';
    }
  }
}
