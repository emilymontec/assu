import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNotEmptyObject, IsObject, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateBankAccountDto {
  @ApiProperty({ description: 'id del Bank ya registrado en Bank Management' })
  @IsUUID()
  bankId!: string;

  @ApiProperty({ example: 'merchant-123' })
  @IsString()
  @IsNotEmpty()
  merchantId!: string;

  @ApiProperty({ example: '3001234567' })
  @IsString()
  @IsNotEmpty()
  accountNumber!: string;

  @ApiPropertyOptional({
    example: 60,
    minimum: 5,
    description:
      'Cada cuántos segundos el Scheduler debe intentar sincronizar esta cuenta. ' +
      'Mínimo 5s como primera línea de defensa contra saturar al banco — ' +
      'el límite real y específico por banco lo aplica Rate Limiting (módulo 17). ' +
      'Si no se especifica, se usa DEFAULT_SYNC_INTERVAL_SECONDS.',
  })
  @IsOptional()
  @IsInt()
  @Min(5)
  syncIntervalSeconds?: number;

  @ApiProperty({
    example: { phone: '3001234567', pin: '1234' },
    description:
      'Credenciales EN TEXTO PLANO — solo viajan así en esta llamada. ' +
      'Se cifran con AES-256-GCM (módulo Credentials/Security) antes de tocar la base de datos, ' +
      'y nunca se devuelven en ninguna respuesta de la API.',
  })
  @IsObject()
  @IsNotEmptyObject()
  credentials!: Record<string, string>;
}
