import { Injectable } from '@nestjs/common';
import type { PasswordResetToken as PrismaPasswordResetToken } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

export interface PasswordResetTokenRecord {
  id: string;
  merchantId: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface CreatePasswordResetData {
  merchantId: string;
  secretHash: string;
  expiresAt: Date;
}

function toRecord(row: PrismaPasswordResetToken): PasswordResetTokenRecord {
  return {
    id: row.id,
    merchantId: row.merchantId,
    expiresAt: row.expiresAt,
    usedAt: row.usedAt,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class PasswordResetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePasswordResetData): Promise<PasswordResetTokenRecord> {
    const row = await this.prisma.passwordResetToken.create({ data });
    return toRecord(row);
  }

  /** Busca un token VIGENTE (no usado) por el hash del secret que viajó en el correo. */
  async findActiveBySecretHash(secretHash: string): Promise<PasswordResetTokenRecord | null> {
    const row = await this.prisma.passwordResetToken.findFirst({
      where: { secretHash, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return row ? toRecord(row) : null;
  }

  async markUsed(id: string): Promise<void> {
    await this.prisma.passwordResetToken.update({ where: { id }, data: { usedAt: new Date() } });
  }

  /**
   * Invalida cualquier token previo sin usar del comercio antes de emitir
   * uno nuevo: solo puede haber UN enlace de recuperación válido a la vez.
   */
  async invalidateAllForMerchant(merchantId: string): Promise<void> {
    await this.prisma.passwordResetToken.updateMany({
      where: { merchantId, usedAt: null },
      data: { usedAt: new Date() },
    });
  }
}
