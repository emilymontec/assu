import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PaymentVerificationService } from './payment-verification.service';
import { PaymentVerificationController } from './payment-verification.controller';
import { ReceiptProcessingProcessor } from './processors/receipt-processing.processor';
import { PaymentSubmissionPersistenceModule } from './payment-submission-persistence.module';
import { ReceiptChannelResponderModule } from './receipt-channel-responder.module';
import { ReceiptProcessingModule } from '../receipt-processing/receipt-processing.module';
import { ReconciliationEngineModule } from '../reconciliation-engine/reconciliation-engine.module';
import { MovementModule } from '../movement/movement.module';
import { EventsModule } from '../events/events.module';
import { RECEIPT_PROCESSING_QUEUE_NAME } from './receipt-processing-queue.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: RECEIPT_PROCESSING_QUEUE_NAME }),
    PaymentSubmissionPersistenceModule,
    ReceiptChannelResponderModule,
    ReceiptProcessingModule,
    ReconciliationEngineModule,
    MovementModule, // expone MOVEMENT_REPOSITORY_PORT: candidatos de conciliación
    EventsModule, // expone EVENT_PUBLISHER_PORT: payment.verification.resolved
  ],
  controllers: [PaymentVerificationController],
  providers: [PaymentVerificationService, ReceiptProcessingProcessor],
  exports: [PaymentVerificationService, PaymentSubmissionPersistenceModule],
})
export class PaymentVerificationModule {}
