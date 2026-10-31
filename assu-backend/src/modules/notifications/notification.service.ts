import { Injectable } from '@nestjs/common';
import { NotificationRepository, NotificationRecord } from './repositories/notification.repository';
import { NotificationType } from '../../core/domain/notification/notification-type.enum';

/**
 * Centro de notificaciones "en la app" del comercio — lo que persiste
 * esto es exactamente lo mismo que manda por correo
 * EmailAndInAppMerchantNotifierAdapter, para que quede visible dentro
 * del Portal aunque el correo no llegue o caiga en spam.
 */
@Injectable()
export class NotificationService {
  constructor(private readonly repository: NotificationRepository) {}

  async record(
    merchantId: string,
    type: NotificationType,
    message: string,
    metadata: Record<string, unknown> | undefined,
    emailSentAt: Date | null,
  ): Promise<NotificationRecord> {
    return this.repository.create({ merchantId, type, message, metadata, emailSentAt });
  }

  async listForMerchant(merchantId: string): Promise<NotificationRecord[]> {
    return this.repository.findAllForMerchant(merchantId);
  }

  async markRead(id: string, merchantId: string): Promise<NotificationRecord> {
    return this.repository.markRead(id, merchantId);
  }
}
