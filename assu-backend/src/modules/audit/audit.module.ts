import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditLogRepository } from './repositories/audit-log.repository';

@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditLogRepository],
  // Login Manager, Sync Engine, Bank/BankAccount Management y Retry &
  // Error Handling inyectan AuditService para dejar rastro de sus
  // operaciones sensibles. No importa nada de esos módulos — evita
  // cualquier riesgo de dependencia circular.
  exports: [AuditService],
})
export class AuditModule {}
