import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SchedulerService } from './scheduler.service';
import { BankAccountModule } from '../bank-account/bank-account.module';
import { SYNC_QUEUE_NAME } from './sync-queue.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: SYNC_QUEUE_NAME }),
    BankAccountModule,
  ],
  providers: [SchedulerService],
  // Admin/Operations (módulo 23) y Sync Engine (módulo 7) podrían necesitar
  // consultar/forzar la programación directamente.
  exports: [SchedulerService],
})
export class SchedulerModule {}
