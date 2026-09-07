import { Module } from '@nestjs/common';
import { RetryErrorHandlingService } from './retry-error-handling.service';
import { BankAccountModule } from '../bank-account/bank-account.module';
import { SyncLogModule } from '../sync-log/sync-log.module';
import { AuditModule } from '../audit/audit.module';
import { MonitoringModule } from '../monitoring/monitoring.module';

@Module({
  imports: [BankAccountModule, SyncLogModule, AuditModule, MonitoringModule],
  providers: [RetryErrorHandlingService],
  exports: [RetryErrorHandlingService],
})
export class RetryErrorHandlingModule {}
