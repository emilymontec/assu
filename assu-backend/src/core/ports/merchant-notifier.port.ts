import { NotificationType } from '../domain/notification/notification-type.enum';

export const MERCHANT_NOTIFIER_PORT = Symbol('MERCHANT_NOTIFIER_PORT');

export interface MerchantNotification {
  merchantId: string;
  type: NotificationType;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Igual que AlertNotifierPort pero para el comercio, no para el equipo
 * de operaciones: quien dispara una notificación (BankAccountService al
 * agregar/eliminar una cuenta, AuthService al completar un login) no
 * sabe ni le importa por qué canal termina llegando. El único adapter
 * de hoy (EmailAndInAppMerchantNotifierAdapter) manda ambos — correo Y
 * la deja en el centro de notificaciones del Portal — pero quien llama
 * esto nunca depende de ese detalle.
 */
export interface MerchantNotifierPort {
  notify(notification: MerchantNotification): Promise<void>;
}
