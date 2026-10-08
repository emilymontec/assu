import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PaymentVerificationService } from '../payment-verification.service';
import { RECEIPT_PROCESSING_QUEUE_NAME, ReceiptProcessingJobData } from '../receipt-processing-queue.constants';

/**
 * Igual filosofía que `SyncProcessor` (módulo 14): la ingesta (webhook
 * de Telegram / endpoint de API) solo crea el `PaymentSubmission` y
 * encola el job — nunca corre OCR ni conciliación en el request HTTP,
 * para poder responder rápido (sección 17: "RESPONDER" antes de
 * "PROCESAR ASÍNCRONAMENTE").
 *
 * `concurrency: 10` es independiente del límite de 5 de `SyncProcessor`:
 * procesar comprobantes no golpea los portales bancarios, así que no
 * hay razón para compartir ese límite.
 *
 * `PaymentVerificationService.process()` es en sí mismo idempotente
 * (revisa `isTerminal()` y usa compare-and-swap en cada transición), así
 * que un reintento de BullMQ o un job duplicado nunca vuelve a verificar
 * ni rechazar un comprobante ya resuelto.
 */
@Processor(RECEIPT_PROCESSING_QUEUE_NAME, { concurrency: 10 })
export class ReceiptProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(ReceiptProcessingProcessor.name);

  constructor(private readonly paymentVerificationService: PaymentVerificationService) {
    super();
  }

  async process(job: Job<ReceiptProcessingJobData>): Promise<void> {
    this.logger.log(`Procesando comprobante ${job.data.submissionId} (job ${job.id}, intento ${job.attemptsMade + 1})`);
    await this.paymentVerificationService.process(job.data.submissionId);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<ReceiptProcessingJobData>): void {
    this.logger.log(`Job de comprobante completado: ${job.data.submissionId}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<ReceiptProcessingJobData> | undefined, error: Error): void {
    const attempts = job?.attemptsMade ?? 0;
    const maxAttempts = job?.opts.attempts ?? '?';
    this.logger.warn(`Fallo procesando comprobante ${job?.data.submissionId} (intento ${attempts}/${maxAttempts}): ${error.message}`);
  }
}
