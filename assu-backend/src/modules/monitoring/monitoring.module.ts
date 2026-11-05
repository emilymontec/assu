import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BankAccountModule } from '../bank-account/bank-account.module';
import { SyncLogModule } from '../sync-log/sync-log.module';
import { EmailModule } from '../email/email.module';
import { AlertController } from './alert.controller';
import { AlertService } from './alert.service';
import { MonitoringService } from './monitoring.service';
import { AlertRepository } from './repositories/alert.repository';
import { LogAlertNotifierService } from './notifiers/log-alert-notifier.service';
import { EmailAlertNotifierService } from './notifiers/email-alert-notifier.service';
import { ALERT_NOTIFIER_PORT, AlertNotifierPort } from '../../core/ports/alert-notifier.port';

@Module({
  // PrismaService y REDIS_CLIENT son @Global() (PrismaModule/RedisModule)
  // — MonitoringService los inyecta directo, sin necesidad de importarlos acá.
  imports: [BankAccountModule, SyncLogModule, EmailModule],
  controllers: [AlertController],
  providers: [
    MonitoringService,
    AlertService,
    AlertRepository,
    LogAlertNotifierService,
    EmailAlertNotifierService,
    {
      provide: ALERT_NOTIFIER_PORT,
      inject: [ConfigService, LogAlertNotifierService, EmailAlertNotifierService],
      // MONITORING_NOTIFIER=email avisa por correo a MONITORING_ALERT_EMAILS;
      // cualquier otro valor (o ausencia, el default) deja el adapter de log.
      useFactory: (
        configService: ConfigService,
        log: LogAlertNotifierService,
        email: EmailAlertNotifierService,
      ): AlertNotifierPort =>
        configService.get<string>('monitoring.notifier') === 'email' ? email : log,
    },
  ],
  // Retry & Error Handling inyecta AlertService para la alerta reactiva
  // de escalación (ACCOUNT_ESCALATED).
  exports: [AlertService],
})
export class MonitoringModule {}
