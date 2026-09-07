import { Injectable } from '@nestjs/common';
import { SyncLogRepository, FinishSyncLogData } from './repositories/sync-log.repository';
import { SyncLog, SyncStatus } from '../../core/domain/sync/sync-log.entity';

@Injectable()
export class SyncLogService {
  constructor(private readonly repository: SyncLogRepository) {}

  /** Cubre "registrar inicio". Sync Engine llama esto antes de tocar el adapter. */
  async start(accountId: string): Promise<SyncLog> {
    return this.repository.start(accountId);
  }

  /** Cubre "registrar finalización/duración/estado/errores". */
  async finish(id: string, data: FinishSyncLogData): Promise<SyncLog> {
    return this.repository.finish(id, data);
  }

  /** Cubre "consultar historial" + "saber cuándo se sincronizó una cuenta". Sin `accountId`, trae de todas las cuentas. */
  async findMany(filters: { accountId?: string; since?: Date; limit?: number } = {}): Promise<SyncLog[]> {
    return this.repository.findMany(filters);
  }

  /**
   * Cuenta cuántos intentos seguidos fallaron, empezando por el más
   * reciente, parando en el primer intento que NO fue FAILED (SUCCESS o
   * PARTIAL). Lo usa Retry & Error Handling (módulo 13) para decidir si
   * escala la cuenta a ERROR.
   */
  async countConsecutiveFailures(accountId: string): Promise<number> {
    const recentLogs = await this.repository.findMany({ accountId, limit: 20 });
    let count = 0;
    for (const log of recentLogs) {
      if (log.status !== SyncStatus.FAILED) {
        break;
      }
      count++;
    }
    return count;
  }
}
