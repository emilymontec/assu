import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentSubmissionStatus } from '../../../core/domain/payment-verification/payment-submission-status.enum';

export class ListSubmissionsQueryDto {
  @ApiPropertyOptional({ enum: PaymentSubmissionStatus })
  @IsOptional()
  @IsEnum(PaymentSubmissionStatus)
  status?: PaymentSubmissionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @ApiPropertyOptional({ description: 'ISO 8601, inicio del rango' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ description: 'ISO 8601, fin del rango' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
