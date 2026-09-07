import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { PaymentSubmissionStatus } from '../../../core/domain/payment-verification/payment-submission-status.enum';

export class ManualReviewDto {
  @ApiProperty({
    enum: PaymentSubmissionStatus,
    description: 'Estado destino. Solo se permiten las transiciones definidas en MANUAL_TRANSITIONS.',
  })
  @IsEnum(PaymentSubmissionStatus)
  toStatus!: PaymentSubmissionStatus;

  @ApiProperty({ description: 'Motivo de la decisión, queda en el audit trail' })
  @IsString()
  @MinLength(5)
  reason!: string;

  @ApiProperty({ description: 'Identificador del operador humano, ej. "operaciones@forttu.co"' })
  @IsString()
  @IsNotEmpty()
  actor!: string;
}
