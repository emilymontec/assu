import { Module } from '@nestjs/common';
import { BankAccountModule } from '../bank-account/bank-account.module';
import { SyncLogModule } from '../sync-log/sync-log.module';
import { AlertController } from './alert.controller';
import { AlertService } from './alert.service';
import { MonitoringService } from './monitoring.service';
import { AlertRepository } from './repositories/alert.repository';
import { LogAlertNotifierService } from './notifiers/log-alert-notifier.service';
import { ALERT_NOTIFIER_PORT } from '../../core/ports/alert-notifier.port';

@Module({
  // PrismaService y REDIS_CLIENT son @Global() (PrismaModule/RedisModule)
  // — MonitoringService los inyecta directo, sin necesidad de importarlos acá.
  imports: [BankAccountModule, SyncLogModule],
  controllers: [AlertController],
  providers: [
    MonitoringService,
    AlertService,
    AlertRepository,
    { provide: ALERT_NOTIFIER_PORT, useClass: LogAlertNotifierService },
  ],
  // Retry & Error Handling inyecta AlertService para la alerta reactiva
  // de escalación (ACCOUNT_ESCALATED).
  exports: [AlertService],
})
export class MonitoringModule {}
