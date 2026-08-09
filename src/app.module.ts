import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './database/prisma.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // ── Infraestructura transversal ──────────────────────────
    ConfigModule,
    PrismaModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        // Enmascarado obligatorio: nunca debe aparecer una credencial en logs.
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

    // ── Módulos de negocio ─────────────────────────────────
    // A medida que se implementen los 23 módulos del roadmap, se importan aquí.
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
