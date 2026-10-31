export const EMAIL_PORT = Symbol('EMAIL_PORT');

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Igual que EventPublisherPort/AlertNotifierPort: quien dispara un
 * correo (AuthService, los notifiers de Merchant) no sabe NI le importa
 * cómo se envía de verdad. Hoy hay dos adapters —
 * ConsoleEmailAdapter (desarrollo, solo loguea) y SmtpEmailAdapter
 * (producción, vía nodemailer) — cambiar de proveedor SMTP o mover esto
 * a un servicio transaccional (SES, Resend, Postmark) el día de mañana
 * es agregar una clase nueva, cero cambios en quien envía.
 */
export interface EmailPort {
  send(message: EmailMessage): Promise<void>;
}
