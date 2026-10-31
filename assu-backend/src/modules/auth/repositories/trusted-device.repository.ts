import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class TrustedDeviceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActive(merchantId: string, fingerprint: string) {
    return this.prisma.trustedDevice.findFirst({
      where: { merchantId, fingerprint, revokedAt: null },
    });
  }

  async countActive(merchantId: string): Promise<number> {
    return this.prisma.trustedDevice.count({ where: { merchantId, revokedAt: null } });
  }

  /** Idempotente: si el dispositivo ya era de confianza, solo actualiza `lastUsedAt`. */
  async upsertTrusted(merchantId: string, fingerprint: string, label: string) {
    return this.prisma.trustedDevice.upsert({
      where: { uniq_merchant_fingerprint: { merchantId, fingerprint } },
      create: { merchantId, fingerprint, label },
      update: { lastUsedAt: new Date(), revokedAt: null },
    });
  }

  async touchLastUsed(id: string): Promise<void> {
    await this.prisma.trustedDevice.update({ where: { id }, data: { lastUsedAt: new Date() } });
  }
}
