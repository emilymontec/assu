import { Injectable, Logger } from '@nestjs/common';
import { EmailMessage, EmailPort } from '../../../core/ports/email.port';

/**
 * Implementación de referencia de EmailPort para desarrollo: no manda
 * nada por la red, solo deja el correo completo en el log — así se
 * puede probar todo el flujo de registro/2FA sin credenciales SMTP
 * reales. Es el default (`EMAIL_PROVIDER` sin configurar o distinto de
 * `smtp`), igual que NullOcrAdapter para OCR.
 */
@Injectable()
export class ConsoleEmailAdapter implements EmailPort {
  private readonly logger = new Logger(ConsoleEmailAdapter.name);

  async send(message: EmailMessage): Promise<void> {
    this.logger.log(
      `[EMAIL_PROVIDER=console] Correo NO enviado de verdad — para enviarlo de verdad, ` +
        `configura EMAIL_PROVIDER=smtp + SMTP_*.\nPara: ${message.to}\nAsunto: ${message.subject}\n${message.text}`,
    );
  }
}
