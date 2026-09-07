import { Module } from '@nestjs/common';
import { SyncEngineService } from './sync-engine.service';
import { SyncEngineController } from './sync-engine.controller';
import { BankAccountModule } from '../bank-account/bank-account.module';
import { BankModule } from '../bank/bank.module';
import { LoginManagerModule } from '../login-manager/login-manager.module';
import { MovementParserModule } from '../movement-parser/movement-parser.module';
import { MovementValidatorModule } from '../movement-validator/movement-validator.module';
import { MovementDeduplicationModule } from '../movement-deduplication/movement-deduplication.module';
import { MovementModule } from '../movement/movement.module';
import { SyncLogModule } from '../sync-log/sync-log.module';
import { RetryErrorHandlingModule } from '../retry-error-handling/retry-error-handling.module';
import { RateLimitingModule } from '../rate-limiting/rate-limiting.module';
import { EventsModule } from '../events/events.module';
import { AuditModule } from '../audit/audit.module';
import { ObservabilityModule } from '../observability/observability.module';

@Module({
  imports: [
    BankAccountModule,
    BankModule,
    LoginManagerModule,
    MovementParserModule,
    MovementValidatorModule,
    MovementDeduplicationModule,
    MovementModule,
    SyncLogModule,
    RetryErrorHandlingModule,
    RateLimitingModule,
    EventsModule,
    AuditModule,
    ObservabilityModule,
  ],
  providers: [SyncEngineService],
  controllers: [SyncEngineController],
  // Queue/Job Management (módulo 14) inyectará esto en su futuro Processor
  // para ejecutar el sync real cuando un job de la cola se procese.
  exports: [SyncEngineService],
})
export class SyncEngineModule {}
