import { Injectable } from '@nestjs/common';
import type { Movement as PrismaMovement, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { Movement } from '../../../core/domain/movement/movement.entity';
import { MovementType } from '../../../core/domain/movement/movement-type.enum';
import { MovementStatus } from '../../../core/domain/movement/movement-status.enum';
import { MovementFilters, MovementRepositoryPort } from '../../../core/ports/movement-repository.port';

function toDomain(record: PrismaMovement): Movement {
  return new Movement(
    record.id,
    record.accountId,
    record.reference,
    Number(record.amount), // Prisma Decimal → number (los montos de este sistema son enteros en pesos, sin decimales)
    record.currency,
    record.sender,
    record.receiver,
    record.movementType as MovementType,
    record.date,
    record.status as MovementStatus,
    record.verified,
    record.rawData as Record<string, unknown>,
    record.createdAt,
  );
}

@Injectable()
export class MovementRepository implements MovementRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(movement: Movement): Promise<Movement> {
    const record = await this.prisma.movement.create({
      data: {
        id: movement.id,
        accountId: movement.accountId,
        reference: movement.reference,
        amount: movement.amount,
        currency: movement.currency,
        sender: movement.sender,
        receiver: movement.receiver,
        movementType: movement.movementType,
        date: movement.date,
        status: movement.status,
        verified: movement.verified,
        rawData: movement.rawData as Prisma.InputJsonValue,
      },
    });
    return toDomain(record);
  }

  /** Última línea de defensa además del índice único en BD (ver schema.prisma). */
  async existsByFingerprint(accountId: string, reference: string, amount: number, date: Date): Promise<boolean> {
    const count = await this.prisma.movement.count({
      where: { accountId, reference, amount, date },
    });
    return count > 0;
  }

  async findMany(filters: MovementFilters): Promise<Movement[]> {
    const records = await this.prisma.movement.findMany({
      where: {
        ...(filters.accountId && { accountId: filters.accountId }),
        ...(filters.status && { status: filters.status as MovementStatus }),
        ...(filters.verified !== undefined && { verified: filters.verified }),
        ...(filters.excludeAlreadyMatched && { paymentSubmission: null }),
        ...((filters.dateFrom || filters.dateTo) && {
          date: {
            ...(filters.dateFrom && { gte: filters.dateFrom }),
            ...(filters.dateTo && { lte: filters.dateTo }),
          },
        }),
      },
      orderBy: { date: 'desc' },
    });
    return records.map(toDomain);
  }

  async findById(id: string): Promise<Movement | null> {
    const record = await this.prisma.movement.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }
}
