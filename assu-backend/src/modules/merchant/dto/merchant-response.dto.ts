import { ApiProperty } from '@nestjs/swagger';
import { Merchant } from '../../../core/domain/merchant/merchant.entity';
import { DocumentType } from '../../../core/domain/merchant/document-type.enum';
import { MerchantStatus } from '../../../core/domain/merchant/merchant-status.enum';

/** Nunca incluye passwordHash ni documentPhotoStorageRef — ninguna respuesta de la API los expone. */
export class MerchantResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: DocumentType }) documentType!: DocumentType;
  @ApiProperty() documentNumber!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty() email!: string;
  @ApiProperty() phone!: string;
  @ApiProperty({ enum: MerchantStatus }) status!: MerchantStatus;
  @ApiProperty({ nullable: true }) emailVerifiedAt!: Date | null;
  @ApiProperty() createdAt!: Date;

  static fromDomain(merchant: Merchant): MerchantResponseDto {
    const dto = new MerchantResponseDto();
    dto.id = merchant.id;
    dto.documentType = merchant.documentType;
    dto.documentNumber = merchant.documentNumber;
    dto.fullName = merchant.fullName;
    dto.email = merchant.email;
    dto.phone = merchant.phone;
    dto.status = merchant.status;
    dto.emailVerifiedAt = merchant.emailVerifiedAt;
    dto.createdAt = merchant.createdAt;
    return dto;
  }
}
