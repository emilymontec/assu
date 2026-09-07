import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { AccountStatus } from '../../../core/domain/bank-account/account-status.enum';

export class ListBankAccountsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bankId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  merchantId?: string;

  @ApiPropertyOptional({ enum: AccountStatus })
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;
}
