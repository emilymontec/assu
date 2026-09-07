import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SyncProcessor } from './processors/sync.processor';
import { SyncEngineModule } from '../sync-engine/sync-engine.module';
import { RetryErrorHandlingModule } from '../retry-error-handling/retry-error-handling.module';
import { ObservabilityModule } from '../observability/observability.module';
import { SYNC_QUEUE_NAME } from '../scheduler/sync-queue.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: SYNC_QUEUE_NAME }), // misma cola que Scheduler ya llena
    SyncEngineModule,
    RetryErrorHandlingModule,
    ObservabilityModule,
  ],
  providers: [SyncProcessor],
})
export class QueueModule {}
