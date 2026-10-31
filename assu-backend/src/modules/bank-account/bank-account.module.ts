import { Module } from '@nestjs/common';
import { BankAccountController } from './bank-account.controller';
import { BankAccountService } from './bank-account.service';
import { BankAccountRepository } from './repositories/bank-account.repository';
import { BankModule } from '../bank/bank.module';
import { CredentialsModule } from '../credentials/credentials.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  // BankModule: para validar que el banco exista/esté activo (BankService.findById).
  // CredentialsModule: para cifrar/descifrar vía ENCRYPTION_PORT.
  // NotificationModule: provee MERCHANT_NOTIFIER_PORT, para avisarle al
  // comercio (correo + centro de notificaciones) cuando se agrega o se
  // elimina una de sus cuentas bancarias.
  imports: [BankModule, CredentialsModule, AuditModule, NotificationModule],
  controllers: [BankAccountController],
  providers: [BankAccountService, BankAccountRepository],
  // Login Manager / Sync Engine (módulos 4/7) inyectarán BankAccountService
  // para leer credenciales descifradas y actualizar el estado de sync.
  exports: [BankAccountService],
})
export class BankAccountModule {}
