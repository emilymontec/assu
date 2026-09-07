import { Module } from '@nestjs/common';
import { BankController } from './bank.controller';
import { BankService } from './bank.service';
import { BankRepository } from './repositories/bank.repository';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [BankController],
  providers: [BankService, BankRepository],
  // Bank Account Management y Bank Adapter System necesitarán consultar
  // bancos (existencia, estado, adapterKey) — lo hacen inyectando BankService.
  exports: [BankService],
})
export class BankModule {}
