import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentSubmission } from '../../../core/domain/payment-verification/payment-submission.entity';

export class PaymentSubmissionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() channel!: string;
  @ApiProperty() status!: string;
  @ApiPropertyOptional() bankAccountId!: string | null;
  @ApiPropertyOptional() matchedMovementId!: string | null;
  @ApiPropertyOptional() matchResult!: string | null;
  @ApiPropertyOptional() matchScore!: number | null;
  @ApiPropertyOptional() ocrConfidence!: string | null;
  @ApiPropertyOptional() rejectionReason!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  static from(submission: PaymentSubmission): PaymentSubmissionResponseDto {
    const dto = new PaymentSubmissionResponseDto();
    dto.id = submission.id;
    dto.channel = submission.channel;
    dto.status = submission.status;
    dto.bankAccountId = submission.bankAccountId;
    dto.matchedMovementId = submission.matchedMovementId;
    dto.matchResult = submission.matchResult;
    dto.matchScore = submission.matchScore;
    dto.ocrConfidence = submission.ocrConfidence;
    dto.rejectionReason = submission.rejectionReason;
    dto.createdAt = submission.createdAt;
    dto.updatedAt = submission.updatedAt;
    // Deliberadamente NO se expone fileStorageRef ni senderIdentifier
    // crudos en la API — evita filtrar rutas internas de almacenamiento
    // o el teléfono completo del cliente en un endpoint interno que
    // puede terminar logueado por otro servicio consumidor.
    return dto;
  }
}
