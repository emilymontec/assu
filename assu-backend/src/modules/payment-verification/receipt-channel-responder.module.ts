import { Module } from '@nestjs/common';
import { TelegramResponderAdapter } from '../receipt-ingestion/adapters/telegram-responder.adapter';
import { RECEIPT_CHANNEL_RESPONDER_PORT } from '../../core/ports/receipt-channel-responder.port';
import { TelegramClientModule } from '../telegram-client/telegram-client.module';

/**
 * Aísla el binding de `RECEIPT_CHANNEL_RESPONDER_PORT` igual que
 * `PaymentSubmissionPersistenceModule` aísla el del repositorio:
 * tanto `PaymentVerificationModule` (para notificar resultados) como
 * `ReceiptIngestionModule` (para el ack inmediato de "recibido") lo
 * necesitan, y uno no debe depender del otro.
 */
@Module({
  imports: [TelegramClientModule],
  providers: [{ provide: RECEIPT_CHANNEL_RESPONDER_PORT, useClass: TelegramResponderAdapter }],
  exports: [RECEIPT_CHANNEL_RESPONDER_PORT],
})
export class ReceiptChannelResponderModule {}
