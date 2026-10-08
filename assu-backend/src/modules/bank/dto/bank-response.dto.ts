import { ApiProperty } from '@nestjs/swagger';
import { Bank } from '../../../core/domain/bank/bank.entity';
import { BankStatus, IntegrationType } from '../../../core/domain/bank/bank-status.enum';

export class BankResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() country!: string;
  @ApiProperty({ enum: BankStatus }) status!: BankStatus;
  @ApiProperty({ enum: IntegrationType }) integrationType!: IntegrationType;
  @ApiProperty() adapterKey!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  static fromDomain(bank: Bank): BankResponseDto {
    const dto = new BankResponseDto();
    dto.id = bank.id;
    dto.name = bank.name;
    dto.country = bank.country;
    dto.status = bank.status;
    dto.integrationType = bank.integrationType;
    dto.adapterKey = bank.adapterKey;
    dto.createdAt = bank.createdAt;
    dto.updatedAt = bank.updatedAt;
    return dto;
  }
}
