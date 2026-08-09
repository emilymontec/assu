import { plainToInstance } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min, validateSync } from 'class-validator';

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

  @IsString()
  CREDENTIALS_ENCRYPTION_KEY!: string;

  @IsString()
  INTERNAL_API_KEY!: string;

  @IsInt()
  @Min(5)
  DEFAULT_SYNC_INTERVAL_SECONDS!: number;

  @IsBoolean()
  PLAYWRIGHT_HEADLESS!: boolean;

  @IsInt()
  @Min(1000)
  PLAYWRIGHT_TIMEOUT_MS!: number;

  @IsString()
  LOG_LEVEL!: string;

  @IsString()
  EVENTS_STREAM_NAME!: string;
}

/**
 * Se ejecuta una sola vez al bootstrapear la app. Si falta o está mal
 * tipeada una variable, la app NO debe arrancar (fail fast).
 */
export function validateEnv(config: Record<string, unknown>) {
  const normalized = {
    ...config,
    PORT: Number(config.PORT),
    REDIS_PORT: Number(config.REDIS_PORT),
    DEFAULT_SYNC_INTERVAL_SECONDS: Number(config.DEFAULT_SYNC_INTERVAL_SECONDS),
    PLAYWRIGHT_TIMEOUT_MS: Number(config.PLAYWRIGHT_TIMEOUT_MS),
    PLAYWRIGHT_HEADLESS: String(config.PLAYWRIGHT_HEADLESS).toLowerCase() === 'true',
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
