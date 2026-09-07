import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ReceiptIngestionService } from './receipt-ingestion.service';
import { ReceiptProcessingModule } from '../receipt-processing/receipt-processing.module';
import { PaymentVerificationModule } from '../payment-verification/payment-verification.module';
import { ReceiptChannelResponderModule } from '../payment-verification/receipt-channel-responder.module';
import { OpenWaClientModule } from '../open-wa-client/open-wa-client.module';
import { RECEIPT_PROCESSING_QUEUE_NAME } from '../payment-verification/receipt-processing-queue.constants';

/**
 * A diferencia de la versión con WhatsApp Cloud API, este módulo no
 * expone ningún controller: no hay webhook público que registrar, la
 * sesión de WhatsApp vive dentro del propio proceso (ver
 * `OpenWaClientModule`).
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: RECEIPT_PROCESSING_QUEUE_NAME }),
    OpenWaClientModule,
    ReceiptProcessingModule,
    PaymentVerificationModule,
    ReceiptChannelResponderModule,
  ],
  providers: [ReceiptIngestionService],
})
export class ReceiptIngestionModule {}
