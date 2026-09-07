import { Injectable } from '@nestjs/common';
import type { Bank as PrismaBank } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { Bank } from '../../../core/domain/bank/bank.entity';
import { BankStatus, CollectorType } from '../../../core/domain/bank/bank-status.enum';

function toDomain(record: PrismaBank): Bank {
  return new Bank(
    record.id,
    record.name,
    record.country,
    record.status as BankStatus,
    record.collectorType as CollectorType,
    record.adapterKey,
    record.createdAt,
    record.updatedAt,
  );
}

export interface CreateBankData {
  name: string;
  country: string;
  collectorType: CollectorType;
  adapterKey: string;
}

export interface UpdateBankData {
  name?: string;
  country?: string;
  collectorType?: CollectorType;
}

export interface BankFilters {
  status?: BankStatus;
  country?: string;
}

@Injectable()
export class BankRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateBankData): Promise<Bank> {
    const record = await this.prisma.bank.create({ data });
    return toDomain(record);
  }

  async findAll(filters: BankFilters = {}): Promise<Bank[]> {
    const records = await this.prisma.bank.findMany({
      where: {
        ...(filters.status && { status: filters.status }),
        ...(filters.country && { country: filters.country }),
      },
      orderBy: { name: 'asc' },
    });
    return records.map(toDomain);
  }

  async findById(id: string): Promise<Bank | null> {
    const record = await this.prisma.bank.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async findByAdapterKey(adapterKey: string): Promise<Bank | null> {
    const record = await this.prisma.bank.findUnique({ where: { adapterKey } });
    return record ? toDomain(record) : null;
  }

  async update(id: string, data: UpdateBankData): Promise<Bank> {
    const record = await this.prisma.bank.update({ where: { id }, data });
    return toDomain(record);
  }

  async updateStatus(id: string, status: BankStatus): Promise<Bank> {
    const record = await this.prisma.bank.update({ where: { id }, data: { status } });
    return toDomain(record);
  }
}
