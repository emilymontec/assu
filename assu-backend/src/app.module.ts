import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './database/prisma.module';
import { RedisModule } from './database/redis.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { HealthModule } from './modules/health/health.module';
import { BankModule } from './modules/bank/bank.module';
import { CredentialsModule } from './modules/credentials/credentials.module';
import { BankAccountModule } from './modules/bank-account/bank-account.module';
import { BankAdapterModule } from './modules/bank-adapter/bank-adapter.module';
import { SessionManagerModule } from './modules/session-manager/session-manager.module';
import { LoginManagerModule } from './modules/login-manager/login-manager.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { MovementParserModule } from './modules/movement-parser/movement-parser.module';
import { MovementValidatorModule } from './modules/movement-validator/movement-validator.module';
import { MovementModule } from './modules/movement/movement.module';
import { MovementDeduplicationModule } from './modules/movement-deduplication/movement-deduplication.module';
import { SyncLogModule } from './modules/sync-log/sync-log.module';
import { EventsModule } from './modules/events/events.module';
import { SyncEngineModule } from './modules/sync-engine/sync-engine.module';
import { QueueModule } from './modules/queue/queue.module';
import { RetryErrorHandlingModule } from './modules/retry-error-handling/retry-error-handling.module';
import { RateLimitingModule } from './modules/rate-limiting/rate-limiting.module';
import { AuditModule } from './modules/audit/audit.module';
import { StatusModule } from './modules/status/status.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { PaymentVerificationModule } from './modules/payment-verification/payment-verification.module';
import { ReceiptIngestionModule } from './modules/receipt-ingestion/receipt-ingestion.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers["x-api-key"]',
            'req.body.encryptedCredentials',
            'req.body.credentials',
            '*.password',
            '*.cookies',
            '*.tokens',
          ],
          censor: '[REDACTED]',
        },
      },
    }),

    // Conexión BullMQ compartida por cualquier módulo que registre colas
    // (Scheduler hoy; Queue/Rate Limiting más adelante usarán la misma).
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
        },
      }),
      inject: [ConfigService],
    }),

    // Habilita los decoradores @Cron/@Interval (usados por SchedulerService).
    ScheduleModule.forRoot(),

    // ── Módulos de negocio ─────────────────────────────────
    HealthModule,
    BankModule,
    CredentialsModule,
    BankAccountModule,
    BankAdapterModule,
    SessionManagerModule,
    LoginManagerModule,
    SchedulerModule,
    MovementParserModule,
    MovementValidatorModule,
    MovementModule,
    MovementDeduplicationModule,
    SyncLogModule,
    EventsModule,
    SyncEngineModule,
    QueueModule,
    RetryErrorHandlingModule,
    RateLimitingModule,
    AuditModule,
    StatusModule,
    MonitoringModule,
    PaymentVerificationModule,
    ReceiptIngestionModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
