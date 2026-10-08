import { Injectable } from '@nestjs/common';
import { ReceiptChannelResponderPort } from '../../../core/ports/receipt-channel-responder.port';
import { TelegramClientService } from '../../telegram-client/telegram-client.service';

/**
 * Implementación de `ReceiptChannelResponderPort` sobre Telegram. Sigue
 * siendo un colaborador "best effort": si el envío falla (bot caído,
 * chat_id inválido), no se relanza aquí — la verificación del
 * comprobante ya quedó resuelta antes de intentar notificar (ver
 * `PaymentVerificationService.notify()`, que ya envuelve esta llamada
 * en un try/catch).
 *
 * `recipientIdentifier` es el `chat.id` de Telegram (numérico, como
 * string) — es exactamente lo que trae `message.chat.id` — por eso
 * `ReceiptIngestionService` guarda ese valor tal cual como
 * `senderIdentifier` del `PaymentSubmission`.
 */
@Injectable()
export class TelegramResponderAdapter implements ReceiptChannelResponderPort {
  constructor(private readonly telegramClientService: TelegramClientService) {}

  async respond(recipientIdentifier: string, message: string): Promise<void> {
    await this.telegramClientService.sendText(recipientIdentifier, message);
  }
}
