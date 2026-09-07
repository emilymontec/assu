import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import type Redis from 'ioredis';
import { PrismaService } from '../../database/prisma.service';
import { REDIS_CLIENT } from '../../database/redis.module';
import { BankAccountService } from '../bank-account/bank-account.service';
import { SyncLogService } from '../sync-log/sync-log.service';
import { AlertService } from './alert.service';
import { AccountStatus } from '../../core/domain/bank-account/account-status.enum';
import { SyncStatus } from '../../core/domain/sync/sync-log.entity';
import { AlertType } from '../../core/domain/monitoring/alert-type.enum';
import { AlertSeverity } from '../../core/domain/monitoring/alert-severity.enum';

/**
 * Corre los 3 chequeos periódicos del roadmap (cuentas sin sincronizar,
 * tasa de errores del sistema, salud de infraestructura). La cuarta
 * fuente de alertas (`ACCOUNT_ESCALATED`) NO vive acá: es reactiva y la
 * dispara directamente Retry & Error Handling en el momento exacto en
 * que escala una cuenta (ver `RetryErrorHandlingService.handleSyncFailure`).
 *
 * Cada chequeo está aislado en su propio try/catch: si uno falla (ej. la
 * query de tasa de errores explota), los otros dos igual corren.
 */
@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    private readonly bankAccountService: BankAccountService,
    private readonly syncLogService: SyncLogService,
    private readonly alertService: AlertService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async runChecks(): Promise<void> {
    await this.safeRun('checkStaleAccounts', () => this.checkStaleAccounts());
    await this.safeRun('checkHighErrorRate', () => this.checkHighErrorRate());
    await this.safeRun('checkInfrastructureHealth', () => this.checkInfrastructureHealth());
  }

  private async safeRun(name: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (err) {
      this.logger.error(`Chequeo de monitoreo "${name}" falló (no bloquea a los demás): ${err}`);
    }
  }

  /** Cubre "alertar cuenta sin sincronizar". */
  async checkStaleAccounts(): Promise<void> {
    const baseThresholdMinutes = this.configService.get<number>('monitoring.accountStaleThresholdMinutes') ?? 30;
    const accounts = await this.bankAccountService.findAll({ status: AccountStatus.ACTIVE });

    for (const { account, bankName } of accounts) {
      if (!account.syncEnabled) continue;

      // Una cuenta que sincroniza cada 20 minutos no debería alertar a
      // los 30 solo porque le tocaba un ciclo largo — el umbral real es
      // el mayor entre el configurado globalmente y 3x su propio intervalo.
      const thresholdMinutes = Math.max(baseThresholdMinutes, (account.syncIntervalSeconds * 3) / 60);
      const referencePoint = account.lastSyncAt ?? account.createdAt;
      const minutesSinceReference = (Date.now() - referencePoint.getTime()) / 60_000;

      if (minutesSinceReference > thresholdMinutes) {
        await this.alertService.raise({
          type: AlertType.ACCOUNT_NOT_SYNCING,
          severity: AlertSeverity.WARNING,
          message: `La cuenta de ${bankName} (${account.id}) no sincroniza hace ${Math.round(minutesSinceReference)} minutos (umbral: ${Math.round(thresholdMinutes)})`,
          entityType: 'BankAccount',
          entityId: account.id,
          metadata: { minutesSinceReference: Math.round(minutesSinceReference), thresholdMinutes: Math.round(thresholdMinutes) },
        });
      }
    }
  }

  /**
   * Cubre "alertar tasa de errores elevada". Deliberadamente a nivel de
   * TODO el sistema, no por banco: una tasa alta y repentina suele
   * significar que algo cambió en varios portales a la vez o que el
   * propio Collector tiene un problema (ej. Playwright roto tras un
   * update) — señal más urgente que un solo banco fallando.
   */
  async checkHighErrorRate(): Promise<void> {
    const windowMinutes = this.configService.get<number>('monitoring.errorRateWindowMinutes') ?? 15;
    const threshold = this.configService.get<number>('monitoring.errorRateThreshold') ?? 0.5;
    const minSampleSize = this.configService.get<number>('monitoring.errorRateMinSampleSize') ?? 3;

    const since = new Date(Date.now() - windowMinutes * 60_000);
    const logs = await this.syncLogService.findMany({ since });
    const finished = logs.filter((log) => log.status !== SyncStatus.RUNNING);

    if (finished.length < minSampleSize) {
      return; // muy pocas muestras para una conclusión confiable
    }

    const failed = finished.filter((log) => log.status === SyncStatus.FAILED).length;
    const rate = failed / finished.length;

    if (rate >= threshold) {
      await this.alertService.raise({
        type: AlertType.HIGH_ERROR_RATE,
        severity: AlertSeverity.CRITICAL,
        message: `Tasa de errores de sincronización elevada: ${failed}/${finished.length} (${Math.round(rate * 100)}%) en los últimos ${windowMinutes} minutos`,
        entityType: 'System',
        entityId: null,
        metadata: { failed, total: finished.length, rate, windowMinutes },
      });
    }
  }

  /** Cubre "alertar problemas del servicio" (Postgres) y "alertar sesiones caídas" (Redis, el session store). */
  async checkInfrastructureHealth(): Promise<void> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      await this.alertService.raise({
        type: AlertType.SERVICE_DEGRADED,
        severity: AlertSeverity.CRITICAL,
        message: 'Postgres no responde',
        entityType: 'Infrastructure',
        entityId: 'postgres',
        metadata: { error: err instanceof Error ? err.message : String(err) },
      });
    }

    try {
      await this.redis.ping();
    } catch (err) {
      await this.alertService.raise({
        type: AlertType.SERVICE_DEGRADED,
        severity: AlertSeverity.CRITICAL,
        message: 'Redis (session store) no responde — las sesiones activas pueden estar caídas',
        entityType: 'Infrastructure',
        entityId: 'redis',
        metadata: { error: err instanceof Error ? err.message : String(err) },
      });
    }
  }
}
