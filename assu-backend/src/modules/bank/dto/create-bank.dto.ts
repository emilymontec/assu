import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
import { CollectorType } from '../../../core/domain/bank/bank-status.enum';

export class CreateBankDto {
  @ApiProperty({ example: 'Nequi' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'CO', description: 'Código de país ISO 3166-1 alpha-2' })
  @IsString()
  @Matches(/^[A-Z]{2}$/, {
    message: 'country debe ser un código ISO 3166-1 alpha-2 en mayúsculas (ej: CO)',
  })
  country!: string;

  @ApiProperty({ enum: CollectorType, example: CollectorType.WEB_SCRAPING })
  @IsEnum(CollectorType)
  collectorType!: CollectorType;

  @ApiProperty({
    example: 'nequi',
    description:
      'Identificador único usado por el AdapterRegistry (módulo 3) para resolver la clase del adapter. No se puede modificar después de creado.',
  })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'adapterKey debe ser kebab-case en minúsculas (ej: nequi, bancolombia)',
  })
  adapterKey!: string;
}
