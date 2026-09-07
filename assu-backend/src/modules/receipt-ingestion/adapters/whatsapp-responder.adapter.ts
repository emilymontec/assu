import { Injectable } from '@nestjs/common';
import { ChatId } from '@open-wa/wa-automate';
import { ReceiptChannelResponderPort } from '../../../core/ports/receipt-channel-responder.port';
import { OpenWaClientService } from '../../open-wa-client/open-wa-client.service';

/**
 * Implementación de `ReceiptChannelResponderPort` sobre open-wa. Sigue
 * siendo un colaborador "best effort": si el envío falla (sesión
 * caída, número inválido), no se relanza aquí — la verificación del
 * comprobante ya quedó resuelta antes de intentar notificar (ver
 * `PaymentVerificationService.notify()`, que ya envuelve esta llamada
 * en un try/catch).
 *
 * `recipientIdentifier` debe ser el `ChatId` de open-wa (formato
 * `<numero>@c.us`), que es exactamente lo que trae `message.from` — por
 * eso `ReceiptIngestionService` guarda ese valor tal cual como
 * `senderIdentifier` del `PaymentSubmission`, en vez de un número de
 * teléfono "pelado" como se hacía con WhatsApp Cloud API.
 */
@Injectable()
export class WhatsAppResponderAdapter implements ReceiptChannelResponderPort {
  constructor(private readonly openWaClientService: OpenWaClientService) {}

  async respond(recipientIdentifier: string, message: string): Promise<void> {
    await this.openWaClientService.sendText(recipientIdentifier as ChatId, message);
  }
}
