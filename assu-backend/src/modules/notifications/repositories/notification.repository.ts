import { Injectable, NotFoundException } from '@nestjs/common';
import type { Notification as PrismaNotification, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { NotificationType } from '../../../core/domain/notification/notification-type.enum';

export interface NotificationRecord {
  id: string;
  merchantId: string;
  type: NotificationType;
  message: string;
  metadata: Record<string, unknown> | null;
  emailSentAt: Date | null;
  readAt: Date | null;
  createdAt: Date;
}

function toRecord(row: PrismaNotification): NotificationRecord {
  return {
    id: row.id,
    merchantId: row.merchantId,
    type: row.type as NotificationType,
    message: row.message,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    emailSentAt: row.emailSentAt,
    readAt: row.readAt,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    merchantId: string;
    type: NotificationType;
    message: string;
    metadata?: Record<string, unknown>;
    emailSentAt: Date | null;
  }): Promise<NotificationRecord> {
    const row = await this.prisma.notification.create({
      data: {
        merchantId: data.merchantId,
        type: data.type,
        message: data.message,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
        emailSentAt: data.emailSentAt,
      },
    });
    return toRecord(row);
  }

  async findAllForMerchant(merchantId: string): Promise<NotificationRecord[]> {
    const rows = await this.prisma.notification.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map(toRecord);
  }

  async markRead(id: string, merchantId: string): Promise<NotificationRecord> {
    // El `where` compuesto (id + merchantId) es la barrera real contra que
    // un comercio marque como leída la notificación de otro: si no
    // coincide el merchantId, Prisma no encuentra la fila y update() lanza.
    const existing = await this.prisma.notification.findFirst({ where: { id, merchantId } });
    if (!existing) {
      throw new NotFoundException('Notificación no encontrada');
    }
    const row = await this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
    return toRecord(row);
  }
}
