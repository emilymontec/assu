import { Module } from '@nestjs/common';
import { LoginManagerService } from './login-manager.service';
import { BankAccountModule } from '../bank-account/bank-account.module';
import { BankModule } from '../bank/bank.module';
import { BankAdapterModule } from '../bank-adapter/bank-adapter.module';
import { SessionManagerModule } from '../session-manager/session-manager.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [BankAccountModule, BankModule, BankAdapterModule, SessionManagerModule, AuditModule],
  providers: [LoginManagerService],
  // Sync Engine (módulo 7) inyectará LoginManagerService para obtener un
  // adapter ya logueado antes de llamar a sync().
  exports: [LoginManagerService],
})
export class LoginManagerModule {}
