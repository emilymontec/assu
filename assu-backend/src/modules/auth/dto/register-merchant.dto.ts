import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, Matches, MinLength } from 'class-validator';
import { DocumentType } from '../../../core/domain/merchant/document-type.enum';

/**
 * Campos de texto del registro — la foto del documento viaja en el
 * mismo multipart/form-data como un archivo aparte (`documentPhoto`),
 * no cabe en un DTO de JSON normal. Ver AuthController.register().
 */
export class RegisterMerchantDto {
  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  documentType!: DocumentType;

  @ApiProperty({ example: '1098765432' })
  @IsString()
  @Matches(/^[0-9]{5,15}$/, { message: 'documentNumber debe ser solo dígitos (5 a 15)' })
  documentNumber!: string;

  @ApiProperty({ example: 'María Pérez' })
  @IsString()
  @MinLength(3)
  fullName!: string;

  @ApiProperty({ example: 'maria@mitienda.co' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '+57 3001234567' })
  @IsString()
  @Matches(/^\+?[0-9 ]{7,15}$/, { message: 'phone debe ser un número de teléfono válido' })
  phone!: string;

  @ApiProperty({
    example: 'Contraseña-Segura123',
    description: 'Mínimo 10 caracteres, con al menos una mayúscula, una minúscula y un número.',
  })
  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{10,}$/, {
    message: 'password debe tener mínimo 10 caracteres, con mayúscula, minúscula y número',
  })
  password!: string;
}
