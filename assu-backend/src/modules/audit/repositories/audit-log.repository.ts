import { Injectable } from '@nestjs/common';
import type { AuditLog as PrismaAuditLog, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AuditLog } from '../../../core/domain/audit/audit-log.entity';
import { AuditAction } from '../../../core/domain/audit/audit-action.enum';
import { AuditResult } from '../../../core/domain/audit/audit-result.enum';

function toDomain(record: PrismaAuditLog): AuditLog {
  return new AuditLog(
    record.id,
    record.action as AuditAction,
    record.actor,
    record.entityType,
    record.entityId,
    record.result as AuditResult,
    (record.metadata as Record<string, unknown> | null) ?? null,
    record.errorMessage,
    record.createdAt,
  );
}

export interface CreateAuditLogData {
  action: AuditAction;
  actor: string;
  entityType: string;
  entityId?: string | null;
  result: AuditResult;
  metadata?: Record<string, unknown> | null;
  errorMessage?: string | null;
}

export interface FindAuditLogsFilters {
  entityType?: string;
  entityId?: string;
  action?: AuditAction;
  result?: AuditResult;
  from?: Date;
  to?: Date;
  limit?: number;
}

@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAuditLogData): Promise<AuditLog> {
    const record = await this.prisma.auditLog.create({
      data: {
        action: data.action,
        actor: data.actor,
        entityType: data.entityType,
        entityId: data.entityId ?? null,
        result: data.result,
        metadata: (data.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        errorMessage: data.errorMessage ?? null,
      },
    });
    return toDomain(record);
  }

  /** Cubre "consultar historial" + soporte de filtros para investigación de incidentes. */
  async findMany(filters: FindAuditLogsFilters = {}): Promise<AuditLog[]> {
    const hasDateRange = filters.from !== undefined || filters.to !== undefined;

    const records = await this.prisma.auditLog.findMany({
      where: {
        entityType: filters.entityType,
        entityId: filters.entityId,
        action: filters.action,
        result: filters.result,
        createdAt: hasDateRange ? { gte: filters.from, lte: filters.to } : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit ?? 50,
    });
    return records.map(toDomain);
  }
}
