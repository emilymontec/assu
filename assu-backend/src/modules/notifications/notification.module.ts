import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './repositories/notification.repository';
import { EmailAndInAppMerchantNotifierAdapter } from './adapters/email-and-in-app-merchant-notifier.adapter';
import { MERCHANT_NOTIFIER_PORT } from '../../core/ports/merchant-notifier.port';
import { EmailModule } from '../email/email.module';
import { MerchantModule } from '../merchant/merchant.module';

@Module({
  imports: [EmailModule, MerchantModule],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationRepository,
    EmailAndInAppMerchantNotifierAdapter,
    { provide: MERCHANT_NOTIFIER_PORT, useClass: EmailAndInAppMerchantNotifierAdapter },
  ],
  // NotificationService se exporta para que AuthModule pueda listar/crear
  // notificaciones directamente si llegara a necesitarlo sin pasar por el
  // puerto; MERCHANT_NOTIFIER_PORT es lo que usan BankAccountService/AuthService.
  exports: [NotificationService, MERCHANT_NOTIFIER_PORT],
})
export class NotificationModule {}
