import { ApiProperty } from '@nestjs/swagger';

/**
 * Vista de SOLO LECTURA de la configuración operativa de Assu — respalda
 * la pantalla "Configuración" del admin. Nunca incluye secretos
 * (claves de cifrado, API keys, credenciales de proxy, token de
 * Telegram): para esos solo se expone si ESTÁN configurados
 * (`*Configured: boolean`), nunca su valor.
 */
export class SystemSettingsResponseDto {
  @ApiProperty({ example: { name: 'assu', env: 'production', version: '0.1.0' } })
  app!: { name: string; env: string; version: string };

  @ApiProperty({
    example: { encryptionProvider: 'local', keyRotationInProgress: false },
    description: 'encryptionProvider: "local" (AES-256-GCM) o "aws-kms". Nunca se expone la clave en sí.',
  })
  security!: { encryptionProvider: 'local' | 'aws-kms'; keyRotationInProgress: boolean };

  @ApiProperty({ example: { defaultSyncIntervalSeconds: 60 } })
  scheduler!: { defaultSyncIntervalSeconds: number };

  @ApiProperty({
    example: { maxRequestsPerBankPerMinute: 20, minSecondsBetweenAccountSyncs: 10 },
  })
  rateLimiting!: { maxRequestsPerBankPerMinute: number; minSecondsBetweenAccountSyncs: number };

  @ApiProperty({
    example: { isolationMode: 'in-process', headless: true, timeoutMs: 30000, proxyConfigured: false },
    description: 'isolationMode: "in-process" o "docker". proxyConfigured indica si hay un proxy dedicado/residencial activo, sin exponer el servidor.',
  })
  scraping!: {
    isolationMode: 'in-process' | 'docker';
    dockerImage: string | null;
    headless: boolean;
    timeoutMs: number;
    proxyConfigured: boolean;
  };

  @ApiProperty({
    example: {
      accountStaleThresholdMinutes: 30,
      errorRateWindowMinutes: 15,
      errorRateThreshold: 0.5,
      errorRateMinSampleSize: 3,
      cooldownMinutes: 60,
    },
  })
  monitoring!: {
    accountStaleThresholdMinutes: number;
    errorRateWindowMinutes: number;
    errorRateThreshold: number;
    errorRateMinSampleSize: number;
    cooldownMinutes: number;
  };

  @ApiProperty({
    example: { ocrProvider: 'tesseract', telegramConfigured: true, eventsStreamName: 'assu.movements' },
    description: 'telegramConfigured indica si TELEGRAM_BOT_TOKEN está presente, sin exponer el token.',
  })
  integrations!: { ocrProvider: string; telegramConfigured: boolean; eventsStreamName: string };

  @ApiProperty() timestamp!: string;
}
