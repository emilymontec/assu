import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsNotEmptyObject, IsObject } from 'class-validator';

export class UpdateCredentialsDto {
  @ApiProperty({
    example: { phone: '3001234567', pin: '5678' },
    description: 'Credenciales nuevas en texto plano; se cifran antes de persistir.',
  })
  @IsObject()
  @IsNotEmptyObject()
  credentials!: Record<string, string>;

  @ApiProperty({
    example: true,
    description: 'Igual que en el registro: confirma que la credencial nueva también es de solo consulta.',
  })
  @Equals(true, { message: 'confirmedReadOnlyCredentials debe ser true: usa una credencial de solo consulta, no la principal' })
  confirmedReadOnlyCredentials!: boolean;
}
