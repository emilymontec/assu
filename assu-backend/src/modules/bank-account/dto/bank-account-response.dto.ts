import { ApiProperty } from '@nestjs/swagger';
import { BankAccount } from '../../../core/domain/bank-account/bank-account.entity';
import { AccountStatus } from '../../../core/domain/bank-account/account-status.enum';

/**
 * IMPORTANTE: esta clase NO tiene ningún campo de credenciales, ni
 * cifradas ni en texto plano. Es la única forma en que una cuenta sale
 * de este módulo hacia afuera (HTTP), y así se queda: nadie que consuma
 * la Internal API debe poder ver ni siquiera el ciphertext.
 */
export class BankAccountResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() bankId!: string;
  @ApiProperty() bankName!: string;
  @ApiProperty() merchantId!: string;
  @ApiProperty() accountNumber!: string;
  @ApiProperty({ enum: AccountStatus }) status!: AccountStatus;
  @ApiProperty() syncEnabled!: boolean;
  @ApiProperty() syncIntervalSeconds!: number;
  @ApiProperty({ nullable: true, type: Date }) lastSyncAt!: Date | null;
  @ApiProperty({ nullable: true }) lastMovementReference!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  static from(account: BankAccount, bankName: string): BankAccountResponseDto {
    const dto = new BankAccountResponseDto();
    dto.id = account.id;
    dto.bankId = account.bankId;
    dto.bankName = bankName;
    dto.merchantId = account.merchantId;
    dto.accountNumber = account.accountNumber;
    dto.status = account.status;
    dto.syncEnabled = account.syncEnabled;
    dto.syncIntervalSeconds = account.syncIntervalSeconds;
    dto.lastSyncAt = account.lastSyncAt;
    dto.lastMovementReference = account.lastMovementReference;
    dto.createdAt = account.createdAt;
    dto.updatedAt = account.updatedAt;
    return dto;
  }
}
