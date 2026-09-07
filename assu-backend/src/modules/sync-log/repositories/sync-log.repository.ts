import { Injectable } from '@nestjs/common';
import type { SyncLog as PrismaSyncLog } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { SyncLog, SyncStatus } from '../../../core/domain/sync/sync-log.entity';

function toDomain(record: PrismaSyncLog): SyncLog {
  return new SyncLog(
    record.id,
    record.accountId,
    record.startedAt,
    record.finishedAt,
    record.status as SyncStatus,
    record.error,
    record.movementsFound,
    record.movementsNew,
  );
}

export interface FinishSyncLogData {
  status: SyncStatus;
  error?: string | null;
  movementsFound: number;
  movementsNew: number;
}

@Injectable()
export class SyncLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async start(accountId: string): Promise<SyncLog> {
    const record = await this.prisma.syncLog.create({
      data: { accountId, status: SyncStatus.RUNNING },
    });
    return toDomain(record);
  }

  async finish(id: string, data: FinishSyncLogData): Promise<SyncLog> {
    const startedRecord = await this.prisma.syncLog.findUniqueOrThrow({ where: { id } });
    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedRecord.startedAt.getTime();

    const record = await this.prisma.syncLog.update({
      where: { id },
      data: {
        status: data.status,
        error: data.error ?? null,
        movementsFound: data.movementsFound,
        movementsNew: data.movementsNew,
        finishedAt,
        durationMs,
      },
    });
    return toDomain(record);
  }

  async findMany(filters: { accountId?: string; since?: Date; limit?: number } = {}): Promise<SyncLog[]> {
    const records = await this.prisma.syncLog.findMany({
      where: {
        ...(filters.accountId && { accountId: filters.accountId }),
        ...(filters.since && { startedAt: { gte: filters.since } }),
      },
      orderBy: { startedAt: 'desc' },
      // Sin `since`, se mantiene el default chico de siempre (20). Con
      // `since` (ventanas de monitoreo), no tiene sentido cortar por
      // cantidad — se quiere TODO lo que cayó en la ventana.
      take: filters.since ? undefined : filters.limit ?? 20,
    });
    return records.map(toDomain);
  }
}
