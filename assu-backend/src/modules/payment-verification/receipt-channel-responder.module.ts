import { Module } from '@nestjs/common';
import { WhatsAppResponderAdapter } from '../receipt-ingestion/adapters/whatsapp-responder.adapter';
import { RECEIPT_CHANNEL_RESPONDER_PORT } from '../../core/ports/receipt-channel-responder.port';
import { OpenWaClientModule } from '../open-wa-client/open-wa-client.module';

/**
 * Aísla el binding de `RECEIPT_CHANNEL_RESPONDER_PORT` igual que
 * `PaymentSubmissionPersistenceModule` aísla el del repositorio:
 * tanto `PaymentVerificationModule` (para notificar resultados) como
 * `ReceiptIngestionModule` (para el ack inmediato de "recibido") lo
 * necesitan, y uno no debe depender del otro.
 */
@Module({
  imports: [OpenWaClientModule],
  providers: [{ provide: RECEIPT_CHANNEL_RESPONDER_PORT, useClass: WhatsAppResponderAdapter }],
  exports: [RECEIPT_CHANNEL_RESPONDER_PORT],
})
export class ReceiptChannelResponderModule {}
