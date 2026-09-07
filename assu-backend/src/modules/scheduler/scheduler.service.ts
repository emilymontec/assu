import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { BankAccountService } from '../bank-account/bank-account.service';
import { AccountStatus } from '../../core/domain/bank-account/account-status.enum';
import { SYNC_JOB_NAME, SYNC_QUEUE_NAME, SyncJobData } from './sync-queue.constants';

/**
 * Solo cuentas en estos estados tiene sentido programar: ACTIVE ya
 * sincronizó al menos una vez con normalidad, PENDING nunca ha
 * sincronizado pero está lista para el primer intento. REAUTH_REQUIRED,
 * SUSPENDED y ERROR se excluyen a propósito — no tiene sentido seguir
 * intentando sin intervención humana o hasta que Retry & Error Handling
 * (módulo 13) decida reintegrarlas.
 */
const SCHEDULABLE_STATUSES: AccountStatus[] = [AccountStatus.ACTIVE, AccountStatus.PENDING];

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectQueue(SYNC_QUEUE_NAME) private readonly syncQueue: Queue<SyncJobData>,
    private readonly bankAccountService: BankAccountService,
  ) {}

  /**
   * Al arrancar la app, programa todas las cuentas que deberían estar
   * sincronizando. Si Redis/DB no están disponibles todavía, no tumba el
   * arranque de la app — solo lo registra como warning.
   */
  async onModuleInit(): Promise<void> {
    try {
      const { scheduled } = await this.scheduleAllActiveAccounts();
      this.logger.log(`Scheduler inicializado: ${scheduled} cuenta(s) programada(s)`);
    } catch (err) {
      this.logger.warn(
        `No se pudieron programar las cuentas al iniciar (¿Redis o la base de datos no están listos aún?): ${err}`,
      );
    }
  }

  /**
   * Re-sincroniza periódicamente la programación de BullMQ contra el
   * estado real en base de datos — cubre el caso en que una cuenta cambió
   * de estado (ej. se activó o se deshabilitó su sync) sin que nadie haya
   * llamado a scheduleAccount()/unscheduleAccount() explícitamente para
   * esa cuenta puntual.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async resyncSchedule(): Promise<void> {
    const { scheduled } = await this.scheduleAllActiveAccounts();
    this.logger.debug(`Resync periódico del scheduler: ${scheduled} cuenta(s) programada(s)`);
  }

  /** Cubre "programar múltiples cuentas": recorre todas las cuentas sincronizables y las programa. */
  async scheduleAllActiveAccounts(): Promise<{ scheduled: number }> {
    const accounts = await this.bankAccountService.findAll({});
    const schedulable = accounts.filter(
      ({ account }) => account.syncEnabled && SCHEDULABLE_STATUSES.includes(account.status),
    );

    for (const { account } of schedulable) {
      await this.scheduleAccount(account.id, account.syncIntervalSeconds);
    }

    // Cuentas que ya no deberían sincronizar pero quedaron con un job
    // repetible activo (ej. se suspendieron después de programarse).
    const schedulableIds = new Set(schedulable.map(({ account }) => account.id));
    const nonSchedulable = accounts.filter(({ account }) => !schedulableIds.has(account.id));
    for (const { account } of nonSchedulable) {
      await this.unscheduleAccount(account.id);
    }

    return { scheduled: schedulable.length };
  }

  /**
   * Cubre "crear jobs de sincronización" + "configurar frecuencia por
   * cuenta". Es idempotente: si la cuenta ya tenía una programación,
   * la reemplaza en vez de duplicarla.
   */
  async scheduleAccount(accountId: string, intervalSeconds: number): Promise<void> {
    await this.unscheduleAccount(accountId);

    await this.syncQueue.add(
      SYNC_JOB_NAME,
      { accountId },
      {
        jobId: accountId,
        repeat: { every: intervalSeconds * 1000 },
        removeOnComplete: true,
        removeOnFail: 50, // conserva los últimos 50 fallos para diagnóstico, sin crecer indefinidamente
        // Cubre "reprogramar sincronizaciones fallidas": esta política ya
        // queda configurada aquí. Falta el Processor real que la consuma
        // (Queue/Job Management, módulo 14, y Sync Engine, módulo 7).
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
  }

  /** Cubre desprogramar: usado internamente y disponible para cuando Bank Account Management suspenda/deshabilite una cuenta. */
  async unscheduleAccount(accountId: string): Promise<void> {
    const repeatableJobs = await this.syncQueue.getRepeatableJobs();
    const existing = repeatableJobs.filter((job) => job.id === accountId);

    for (const job of existing) {
      await this.syncQueue.removeRepeatableByKey(job.key);
    }
  }

  /** Útil para Admin/Operations (módulo 23): ver qué hay programado sin tocar la base de datos. */
  async listScheduledAccountIds(): Promise<string[]> {
    const repeatableJobs = await this.syncQueue.getRepeatableJobs();
    return repeatableJobs.map((job) => job.id).filter((id): id is string => !!id);
  }
}
