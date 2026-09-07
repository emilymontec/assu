import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
import { SyncEngineService, SyncResult } from '../../sync-engine/sync-engine.service';
import { RetryErrorHandlingService } from '../../retry-error-handling/retry-error-handling.service';
import { MetricsService } from '../../observability/metrics.service';
import { SYNC_QUEUE_NAME, SyncJobData } from '../../scheduler/sync-queue.constants';

/**
 * El consumidor de la cola que el Scheduler llena. `concurrency: 5` cubre
 * "controlar concurrencia" del roadmap: como máximo 5 cuentas
 * sincronizando a la vez EN ESTE WORKER — el límite específico por banco
 * (para no saturarlo) es trabajo de Rate Limiting (módulo 17), que sigue
 * pendiente.
 *
 * Las políticas de reintento (`attempts`, `backoff`) ya las configuró el
 * Scheduler al encolar cada job. Este Processor SÍ toma una decisión
 * propia: si el error es permanente (credenciales inválidas, portal
 * cambiado), lanza `UnrecoverableError` para que BullMQ NO reintente sin
 * sentido — reintentar contra una credencial que ya sabemos inválida solo
 * desperdicia intentos y podría acercar al banco a un bloqueo por exceso
 * de consultas.
 */
@Processor(SYNC_QUEUE_NAME, { concurrency: 5 })
export class SyncProcessor extends WorkerHost {
  private readonly logger = new Logger(SyncProcessor.name);

  constructor(
    private readonly syncEngineService: SyncEngineService,
    private readonly retryErrorHandlingService: RetryErrorHandlingService,
    private readonly metricsService: MetricsService,
  ) {
    super();
  }

  async process(job: Job<SyncJobData>): Promise<SyncResult> {
    this.logger.log(
      `Procesando sync de la cuenta ${job.data.accountId} (job ${job.id}, intento ${job.attemptsMade + 1})`,
    );

    try {
      return await this.syncEngineService.syncAccount(job.data.accountId);
    } catch (err) {
      const { retryable, reason } = this.retryErrorHandlingService.classify(err);

      if (!retryable) {
        this.logger.warn(
          `Error permanente para la cuenta ${job.data.accountId}; no se reintentará: ${reason}`,
        );
        throw new UnrecoverableError(reason);
      }

      this.metricsService.recordRetry();
      throw err; // deja que BullMQ reintente según attempts/backoff ya configurados
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<SyncJobData>, result: SyncResult): void {
    this.logger.log(
      `Sync completado para la cuenta ${job.data.accountId}: ${result.movementsNew}/${result.movementsFound} movimientos nuevos`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<SyncJobData> | undefined, error: Error): void {
    const attempts = job?.attemptsMade ?? 0;
    const maxAttempts = job?.opts.attempts ?? '?';
    this.logger.warn(`Sync falló para la cuenta ${job?.data.accountId} (intento ${attempts}/${maxAttempts}): ${error.message}`);
  }
}
