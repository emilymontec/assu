import { INestApplication, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const CONNECT_MAX_ATTEMPTS = 5;
const CONNECT_RETRY_BASE_DELAY_MS = 1000;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    for (let attempt = 1; attempt <= CONNECT_MAX_ATTEMPTS; attempt += 1) {
      try {
        await this.$connect();
        this.logger.log('Conexión a PostgreSQL establecida');
        return;
      } catch (err) {
        if (attempt === CONNECT_MAX_ATTEMPTS) {
          this.logger.error(
            `No se pudo conectar a PostgreSQL tras ${CONNECT_MAX_ATTEMPTS} intentos: ${this.describeError(err)}`,
          );
          throw err;
        }

        const delayMs = CONNECT_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
        this.logger.warn(
          `No se pudo conectar a PostgreSQL (intento ${attempt}/${CONNECT_MAX_ATTEMPTS}): ${this.describeError(err)}. Reintentando en ${delayMs} ms...`,
        );
        await this.sleep(delayMs);
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication): Promise<void> {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }

  private describeError(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
