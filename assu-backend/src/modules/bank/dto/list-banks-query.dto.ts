import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BankStatus } from '../../../core/domain/bank/bank-status.enum';

export class ListBanksQueryDto {
  @ApiPropertyOptional({ enum: BankStatus, description: 'Filtrar por estado' })
  @IsOptional()
  @IsEnum(BankStatus)
  status?: BankStatus;

  @ApiPropertyOptional({ example: 'CO', description: 'Filtrar por país (ISO 3166-1 alpha-2)' })
  @IsOptional()
  @IsString()
  country?: string;
}
