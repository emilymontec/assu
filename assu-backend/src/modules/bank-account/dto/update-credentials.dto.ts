import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmptyObject, IsObject } from 'class-validator';

export class UpdateCredentialsDto {
  @ApiProperty({
    example: { phone: '3001234567', pin: '5678' },
    description: 'Credenciales nuevas en texto plano; se cifran antes de persistir.',
  })
  @IsObject()
  @IsNotEmptyObject()
  credentials!: Record<string, string>;
}
