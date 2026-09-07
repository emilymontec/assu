import { Injectable } from '@nestjs/common';
import type { AlertLog as PrismaAlertLog, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { Alert } from '../../../core/domain/monitoring/alert.entity';
import { AlertType } from '../../../core/domain/monitoring/alert-type.enum';
import { AlertSeverity } from '../../../core/domain/monitoring/alert-severity.enum';

function toDomain(record: PrismaAlertLog): Alert {
  return new Alert(
    record.id,
    record.type as AlertType,
    record.severity as AlertSeverity,
    record.message,
    record.entityType,
    record.entityId,
    (record.metadata as Record<string, unknown> | null) ?? null,
    record.createdAt,
  );
}

export interface CreateAlertData {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  entityType: string;
  entityId: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface FindAlertsFilters {
  type?: AlertType;
  severity?: AlertSeverity;
  entityType?: string;
  entityId?: string;
  since?: Date;
  limit?: number;
}

@Injectable()
export class AlertRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAlertData): Promise<Alert> {
    const record = await this.prisma.alertLog.create({
      data: {
        type: data.type,
        severity: data.severity,
        message: data.message,
        entityType: data.entityType,
        entityId: data.entityId,
        metadata: (data.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
    return toDomain(record);
  }

  /**
   * Trae la MÁS RECIENTE alerta de un tipo/entidad — es lo único que
   * necesita el cooldown de AlertService para decidir si ya se avisó
   * hace poco.
   */
  async findLatest(type: AlertType, entityId: string | null): Promise<Alert | null> {
    const record = await this.prisma.alertLog.findFirst({
      where: { type, entityId },
      orderBy: { createdAt: 'desc' },
    });
    return record ? toDomain(record) : null;
  }

  async findMany(filters: FindAlertsFilters = {}): Promise<Alert[]> {
    const hasDateFilter = filters.since !== undefined;
    const records = await this.prisma.alertLog.findMany({
      where: {
        type: filters.type,
        severity: filters.severity,
        entityType: filters.entityType,
        entityId: filters.entityId,
        createdAt: hasDateFilter ? { gte: filters.since } : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit ?? 50,
    });
    return records.map(toDomain);
  }
}
