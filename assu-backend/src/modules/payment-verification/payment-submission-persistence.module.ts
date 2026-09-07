import { Module } from '@nestjs/common';
import { PaymentSubmissionRepository } from './repositories/payment-submission.repository';
import { PAYMENT_SUBMISSION_REPOSITORY_PORT } from '../../core/ports/payment-submission-repository.port';

/**
 * Aísla solo el binding del repositorio. `ReceiptProcessingModule`
 * (para FraudDetectionService) y `PaymentVerificationModule` (para todo
 * lo demás) importan este módulo en vez de importarse entre sí,
 * evitando una dependencia circular Nest.
 */
@Module({
  providers: [
    PaymentSubmissionRepository,
    { provide: PAYMENT_SUBMISSION_REPOSITORY_PORT, useExisting: PaymentSubmissionRepository },
  ],
  exports: [PAYMENT_SUBMISSION_REPOSITORY_PORT],
})
export class PaymentSubmissionPersistenceModule {}
