import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SystemSettingsResponseDto } from './dto/system-settings-response.dto';

/**
 * Cubre la parte de solo-lectura de Admin/Operations (módulo 23) que no
 * tenía vista propia: "revisar configuración" operativa de Assu. No
 * persiste ni modifica nada — todo sale de `ConfigService` (que a su
 * vez lee `config/configuration.ts`, ya validado por `env.validation.ts`
 * al arrancar). Deliberadamente de solo lectura: estos valores vienen de
 * variables de entorno, así que cambiarlos requiere redeploy, no un
 * PATCH desde el admin.
 */
@Injectable()
export class SettingsService {
  constructor(private readonly configService: ConfigService) {}

  getSettings(): SystemSettingsResponseDto {
    return {
      app: {
        name: this.configService.get<string>('app.name')!,
        env: this.configService.get<string>('app.env')!,
        version: process.env.npm_package_version ?? '0.1.0',
      },
      security: {
        encryptionProvider: this.configService.get<'local' | 'aws-kms'>('security.encryptionProvider')!,
        // Una clave previa solo debería existir durante una ventana de
        // rotación (ver config/configuration.ts) — nunca en operación normal.
        keyRotationInProgress: Boolean(this.configService.get<string>('security.credentialsEncryptionKeyPrevious')),
      },
      scheduler: {
        defaultSyncIntervalSeconds: this.configService.get<number>('scheduler.defaultSyncIntervalSeconds')!,
      },
      rateLimiting: {
        maxRequestsPerBankPerMinute: this.configService.get<number>('rateLimiting.maxRequestsPerBankPerMinute')!,
        minSecondsBetweenAccountSyncs: this.configService.get<number>(
          'rateLimiting.minSecondsBetweenAccountSyncs',
        )!,
      },
      scraping: {
        isolationMode: this.configService.get<'in-process' | 'docker'>('scraperIsolation.mode')!,
        dockerImage:
          this.configService.get<string>('scraperIsolation.mode') === 'docker'
            ? this.configService.get<string>('scraperIsolation.dockerImage')!
            : null,
        headless: this.configService.get<boolean>('playwright.headless')!,
        timeoutMs: this.configService.get<number>('playwright.timeoutMs')!,
        proxyConfigured: Boolean(this.configService.get('playwright.proxy')),
      },
      monitoring: {
        accountStaleThresholdMinutes: this.configService.get<number>('monitoring.accountStaleThresholdMinutes')!,
        errorRateWindowMinutes: this.configService.get<number>('monitoring.errorRateWindowMinutes')!,
        errorRateThreshold: this.configService.get<number>('monitoring.errorRateThreshold')!,
        errorRateMinSampleSize: this.configService.get<number>('monitoring.errorRateMinSampleSize')!,
        cooldownMinutes: this.configService.get<number>('monitoring.cooldownMinutes')!,
      },
      integrations: {
        ocrProvider: this.configService.get<string>('ocr.provider')!,
        telegramConfigured: Boolean(this.configService.get<string>('telegram.botToken')),
        eventsStreamName: this.configService.get<string>('events.streamName')!,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
