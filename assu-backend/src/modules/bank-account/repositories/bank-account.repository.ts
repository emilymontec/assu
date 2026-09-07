import { Injectable } from '@nestjs/common';
import type { BankAccount as PrismaBankAccount } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { BankAccount } from '../../../core/domain/bank-account/bank-account.entity';
import { AccountStatus } from '../../../core/domain/bank-account/account-status.enum';

type PrismaBankAccountWithBank = PrismaBankAccount & { bank: { name: string } };

function toDomain(record: PrismaBankAccount): BankAccount {
  return new BankAccount(
    record.id,
    record.bankId,
    record.merchantId,
    record.accountNumber,
    record.encryptedCredentials,
    record.status as AccountStatus,
    record.syncEnabled,
    record.syncIntervalSeconds,
    record.lastSyncAt,
    record.lastMovementReference,
    record.createdAt,
    record.updatedAt,
  );
}

/** Proyección de lectura: la entidad de dominio no conoce `bankName` (es un detalle de la vista, no del dominio). */
export interface BankAccountWithBankName {
  account: BankAccount;
  bankName: string;
}

export interface CreateBankAccountData {
  bankId: string;
  merchantId: string;
  accountNumber: string;
  encryptedCredentials: string;
  syncIntervalSeconds: number;
}

export interface BankAccountFilters {
  bankId?: string;
  merchantId?: string;
  status?: AccountStatus;
}

@Injectable()
export class BankAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateBankAccountData): Promise<BankAccount> {
    const record = await this.prisma.bankAccount.create({
      data: { ...data, status: AccountStatus.PENDING },
    });
    return toDomain(record);
  }

  async findAllWithBank(filters: BankAccountFilters = {}): Promise<BankAccountWithBankName[]> {
    const records = await this.prisma.bankAccount.findMany({
      where: {
        ...(filters.bankId && { bankId: filters.bankId }),
        ...(filters.merchantId && { merchantId: filters.merchantId }),
        ...(filters.status && { status: filters.status }),
      },
      include: { bank: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r: PrismaBankAccountWithBank) => ({ account: toDomain(r), bankName: r.bank.name }));
  }

  async findByIdWithBank(id: string): Promise<BankAccountWithBankName | null> {
    const record: PrismaBankAccountWithBank | null = await this.prisma.bankAccount.findUnique({
      where: { id },
      include: { bank: { select: { name: true } } },
    });
    return record ? { account: toDomain(record), bankName: record.bank.name } : null;
  }

  /** Sin join — usado internamente cuando solo se necesita el ciphertext (ej. para descifrar). */
  async findById(id: string): Promise<BankAccount | null> {
    const record = await this.prisma.bankAccount.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async updateAccountNumber(id: string, accountNumber: string): Promise<BankAccount> {
    const record = await this.prisma.bankAccount.update({ where: { id }, data: { accountNumber } });
    return toDomain(record);
  }

  /** Rotar credenciales siempre vuelve la cuenta a PENDING: nadie ha probado que las nuevas funcionen todavía. */
  async updateCredentials(id: string, encryptedCredentials: string): Promise<BankAccount> {
    const record = await this.prisma.bankAccount.update({
      where: { id },
      data: { encryptedCredentials, status: AccountStatus.PENDING },
    });
    return toDomain(record);
  }

  async updateStatus(id: string, status: AccountStatus): Promise<BankAccount> {
    const record = await this.prisma.bankAccount.update({ where: { id }, data: { status } });
    return toDomain(record);
  }

  async updateSyncEnabled(id: string, syncEnabled: boolean): Promise<BankAccount> {
    const record = await this.prisma.bankAccount.update({ where: { id }, data: { syncEnabled } });
    return toDomain(record);
  }

  async updateSyncInterval(id: string, syncIntervalSeconds: number): Promise<BankAccount> {
    const record = await this.prisma.bankAccount.update({ where: { id }, data: { syncIntervalSeconds } });
    return toDomain(record);
  }

  /**
   * Marca una cuenta como recién sincronizada con éxito: actualiza
   * `lastSyncAt` siempre, y el puntero de "último movimiento leído" solo
   * si se pasa uno nuevo (`null` = "se sincronizó bien pero no había
   * nada nuevo que apuntar", sin tocar el puntero existente).
   */
  async recordSuccessfulSync(id: string, lastMovementReference: string | null): Promise<BankAccount> {
    const record = await this.prisma.bankAccount.update({
      where: { id },
      data: {
        status: AccountStatus.ACTIVE,
        lastSyncAt: new Date(),
        ...(lastMovementReference !== null && { lastMovementReference }),
      },
    });
    return toDomain(record);
  }
}
