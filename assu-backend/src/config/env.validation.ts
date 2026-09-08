import { plainToInstance } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Min, ValidateIf, validateSync } from 'class-validator';

/** AES-256 requiere una clave de exactamente 32 bytes → 64 caracteres hex. */
const HEX_256_BIT_KEY = /^[0-9a-fA-F]{64}$/;
const HEX_KEY_MESSAGE =
  'debe ser una clave hexadecimal de 32 bytes (64 caracteres). Generar con: openssl rand -hex 32';

class EnvironmentVariables {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV!: string;

  @IsInt()
  @Min(1)
  PORT!: number;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  REDIS_HOST!: string;

  @IsInt()
  REDIS_PORT!: number;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  @IsOptional()
  @IsIn(['local', 'aws-kms'])
  ENCRYPTION_PROVIDER?: string;

  // Requerida solo si ENCRYPTION_PROVIDER no es 'aws-kms' (es decir, en el
  // default 'local' y cuando la variable ni siquiera está presente).
  @ValidateIf((o) => o.ENCRYPTION_PROVIDER !== 'aws-kms')
  @Matches(HEX_256_BIT_KEY, { message: `CREDENTIALS_ENCRYPTION_KEY ${HEX_KEY_MESSAGE}` })
  CREDENTIALS_ENCRYPTION_KEY!: string;

  /**
   * Solo se usa durante una ventana de rotación de claves: permite
   * seguir descifrando datos cifrados con la clave anterior mientras
   * las credenciales existentes migran a la nueva. Nunca se usa para
   * cifrar datos nuevos.
   */
  @IsOptional()
  @Matches(HEX_256_BIT_KEY, { message: `CREDENTIALS_ENCRYPTION_KEY_PREVIOUS ${HEX_KEY_MESSAGE}` })
  CREDENTIALS_ENCRYPTION_KEY_PREVIOUS?: string;

  @IsOptional()
  @IsString()
  AWS_KMS_REGION?: string;

  // Requerida SOLO cuando ENCRYPTION_PROVIDER=aws-kms está activo.
  @ValidateIf((o) => o.ENCRYPTION_PROVIDER === 'aws-kms')
  @IsString()
  AWS_KMS_KEY_ID?: string;

  @IsOptional()
  @IsIn(['in-process', 'docker'])
  SCRAPER_ISOLATION_MODE?: string;

  @IsOptional()
  @IsString()
  SCRAPER_DOCKER_IMAGE?: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  SCRAPER_CONTAINER_TIMEOUT_MS?: number;

  @IsOptional()
  @IsString()
  SCRAPER_DOCKER_NETWORK?: string;

  @IsString()
  INTERNAL_API_KEY!: string;

  @IsInt()
  @Min(5)
  DEFAULT_SYNC_INTERVAL_SECONDS!: number;

  @IsInt()
  @Min(1)
  RATE_LIMIT_MAX_PER_BANK_PER_MINUTE!: number;

  @IsInt()
  @Min(1)
  RATE_LIMIT_MIN_SECONDS_BETWEEN_ACCOUNT_SYNCS!: number;

  @IsBoolean()
  PLAYWRIGHT_HEADLESS!: boolean;

  @IsInt()
  @Min(1000)
  PLAYWRIGHT_TIMEOUT_MS!: number;

  @IsOptional()
  @IsString()
  PLAYWRIGHT_PROXY_SERVER?: string;

  @IsOptional()
  @IsString()
  PLAYWRIGHT_PROXY_USERNAME?: string;

  @IsOptional()
  @IsString()
  PLAYWRIGHT_PROXY_PASSWORD?: string;

  @IsString()
  LOG_LEVEL!: string;

  @IsString()
  EVENTS_STREAM_NAME!: string;

  // ── Verificación de comprobantes ──────────────────────────────
  // Todas opcionales: si no se configuran, el sistema sigue arrancando
  // (Collector puede operar solo con detección de movimientos), pero
  // los endpoints de WhatsApp/OCR reales quedarán sin funcionar hasta
  // que se completen.
  @IsOptional()
  @IsString()
  RECEIPTS_STORAGE_PATH?: string;

  @IsOptional()
  @IsString()
  OCR_PROVIDER?: string;

  @IsOptional()
  @IsString()
  OPENWA_SESSION_ID?: string;

  @IsOptional()
  @IsString()
  OPENWA_HEADLESS?: string;

  @IsOptional()
  @IsString()
  OPENWA_BANK_ACCOUNT_ID?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const normalized = {
    ...config,
    PORT: Number(config.PORT),
    REDIS_PORT: Number(config.REDIS_PORT),
    DEFAULT_SYNC_INTERVAL_SECONDS: Number(config.DEFAULT_SYNC_INTERVAL_SECONDS),
    RATE_LIMIT_MAX_PER_BANK_PER_MINUTE: Number(config.RATE_LIMIT_MAX_PER_BANK_PER_MINUTE),
    RATE_LIMIT_MIN_SECONDS_BETWEEN_ACCOUNT_SYNCS: Number(config.RATE_LIMIT_MIN_SECONDS_BETWEEN_ACCOUNT_SYNCS),
    PLAYWRIGHT_TIMEOUT_MS: Number(config.PLAYWRIGHT_TIMEOUT_MS),
    PLAYWRIGHT_HEADLESS: String(config.PLAYWRIGHT_HEADLESS).toLowerCase() === 'true',
    SCRAPER_CONTAINER_TIMEOUT_MS:
      config.SCRAPER_CONTAINER_TIMEOUT_MS !== undefined && config.SCRAPER_CONTAINER_TIMEOUT_MS !== ''
        ? Number(config.SCRAPER_CONTAINER_TIMEOUT_MS)
        : undefined,
    SCRAPER_ISOLATION_MODE: config.SCRAPER_ISOLATION_MODE || undefined,
    ENCRYPTION_PROVIDER: config.ENCRYPTION_PROVIDER || undefined,
  };

  const validated = plainToInstance(EnvironmentVariables, normalized, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(`Configuración de entorno inválida:\n${errors.toString()}`);
  }

  return validated;
}
