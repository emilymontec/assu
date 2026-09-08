import { AccountStatus } from './account-status.enum';

export class BankAccount {
  constructor(
    public readonly id: string,
    public readonly bankId: string,
    public readonly merchantId: string,
    public accountNumber: string,
    public encryptedCredentials: string,
    public credentialsReadOnlyConfirmed: boolean,
    public status: AccountStatus,
    public syncEnabled: boolean,
    public syncIntervalSeconds: number,
    public lastSyncAt: Date | null,
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
