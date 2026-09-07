import { Module } from '@nestjs/common';
import { SyncLogController } from './sync-log.controller';
import { SyncLogService } from './sync-log.service';
import { SyncLogRepository } from './repositories/sync-log.repository';

@Module({
  controllers: [SyncLogController],
  providers: [SyncLogService, SyncLogRepository],
  exports: [SyncLogService],
})
export class SyncLogModule {}
