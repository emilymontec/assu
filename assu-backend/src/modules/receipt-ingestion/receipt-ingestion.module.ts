import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ReceiptIngestionService } from './receipt-ingestion.service';
import { ReceiptProcessingModule } from '../receipt-processing/receipt-processing.module';
import { PaymentVerificationModule } from '../payment-verification/payment-verification.module';
import { ReceiptChannelResponderModule } from '../payment-verification/receipt-channel-responder.module';
import { TelegramClientModule } from '../telegram-client/telegram-client.module';
import { RECEIPT_PROCESSING_QUEUE_NAME } from '../payment-verification/receipt-processing-queue.constants';

/**
 * Este módulo no expone ningún controller: no hay webhook público que
 * registrar, el bot de Telegram vive dentro del propio proceso (ver
 * `TelegramClientModule`).
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: RECEIPT_PROCESSING_QUEUE_NAME }),
    TelegramClientModule,
    ReceiptProcessingModule,
    PaymentVerificationModule,
    ReceiptChannelResponderModule,
  ],
  providers: [ReceiptIngestionService],
})
export class ReceiptIngestionModule {}
