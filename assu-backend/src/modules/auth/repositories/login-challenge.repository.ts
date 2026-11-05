import { Injectable } from '@nestjs/common';
import type { LoginChallenge as PrismaLoginChallenge } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { LoginChallengeType } from '../../../core/domain/auth/login-challenge-type.enum';
import { LoginChallengeStatus } from '../../../core/domain/auth/login-challenge-status.enum';

export interface LoginChallengeRecord {
  id: string;
  attemptId: string;
  merchantId: string;
  type: LoginChallengeType;
  secretHash: string | null;
  newDeviceFingerprint: string;
  newDeviceLabel: string;
  status: LoginChallengeStatus;
  expiresAt: Date;
  createdAt: Date;
}

export interface CreateChallengeData {
  attemptId: string;
  merchantId: string;
  type: LoginChallengeType;
  secretHash: string | null;
  newDeviceFingerprint: string;
  newDeviceLabel: string;
  expiresAt: Date;
}

function toRecord(row: PrismaLoginChallenge): LoginChallengeRecord {
  return {
    id: row.id,
    attemptId: row.attemptId,
    merchantId: row.merchantId,
    type: row.type as LoginChallengeType,
    secretHash: row.secretHash,
    newDeviceFingerprint: row.newDeviceFingerprint,
    newDeviceLabel: row.newDeviceLabel,
    status: row.status as LoginChallengeStatus,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class LoginChallengeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateChallengeData): Promise<LoginChallengeRecord> {
    const row = await this.prisma.loginChallenge.create({ data });
    return toRecord(row);
  }

  async findByAttemptId(attemptId: string): Promise<LoginChallengeRecord[]> {
    const rows = await this.prisma.loginChallenge.findMany({ where: { attemptId } });
    return rows.map(toRecord);
  }

  async findPendingByAttemptIdAndType(attemptId: string, type: LoginChallengeType): Promise<LoginChallengeRecord | null> {
    const row = await this.prisma.loginChallenge.findFirst({
      where: { attemptId, type, status: LoginChallengeStatus.PENDING },
    });
    return row ? toRecord(row) : null;
  }

  async findPendingDeviceApprovalsForMerchant(merchantId: string): Promise<LoginChallengeRecord[]> {
    const rows = await this.prisma.loginChallenge.findMany({
      where: { merchantId, type: LoginChallengeType.DEVICE_APPROVAL, status: LoginChallengeStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toRecord);
  }

  async findById(id: string): Promise<LoginChallengeRecord | null> {
    const row = await this.prisma.loginChallenge.findUnique({ where: { id } });
    return row ? toRecord(row) : null;
  }

  async updateStatus(id: string, status: LoginChallengeStatus): Promise<LoginChallengeRecord> {
    const row = await this.prisma.loginChallenge.update({ where: { id }, data: { status } });
    return toRecord(row);
  }

  /**
   * Reemplaza el secret y renueva la expiración de un challenge pendiente —
   * lo usa el "reenviar código": se emite un código nuevo sobre el MISMO
   * attemptId para que el polling del dispositivo que inició sesión siga
   * funcionando sin reiniciar el flujo.
   */
  async updateSecret(id: string, secretHash: string, expiresAt: Date): Promise<LoginChallengeRecord> {
    const row = await this.prisma.loginChallenge.update({ where: { id }, data: { secretHash, expiresAt } });
    return toRecord(row);
  }
}
