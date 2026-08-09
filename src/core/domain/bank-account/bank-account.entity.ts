import { AccountStatus } from './account-status.enum';

/**
 * Representa una cuenta bancaria/billetera de un merchant, conectada al Collector.
 * `encryptedCredentials` nunca se descifra fuera del módulo Credentials/Security.
 */
export class BankAccount {
  constructor(
    public readonly id: string,
    public readonly bankId: string,
    public readonly merchantId: string,
    public accountNumber: string,
    public encryptedCredentials: string,
    public status: AccountStatus,
    public syncEnabled: boolean,
    public lastSyncAt: Date | null,
    /** Puntero al último movimiento leído, para no releer el historial completo en cada sync. */
    public lastMovementReference: string | null,
    public readonly createdAt: Date,
    public updatedAt: Date = new Date(),
  ) {}

  needsReconnection(): boolean {
    return this.status === AccountStatus.REAUTH_REQUIRED;
  }

  canSync(): boolean {
    return this.syncEnabled && this.status === AccountStatus.ACTIVE;
  }

  markSyncSuccess(lastMovementReference: string | null): void {
    this.status = AccountStatus.ACTIVE;
    this.lastSyncAt = new Date();
    this.lastMovementReference = lastMovementReference ?? this.lastMovementReference;
    this.updatedAt = new Date();
  }

  markReauthRequired(): void {
    this.status = AccountStatus.REAUTH_REQUIRED;
    this.updatedAt = new Date();
  }
}
