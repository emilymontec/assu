import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class LastSyncQueryDto {
  @ApiPropertyOptional({ description: 'Si se omite, devuelve el resumen de TODAS las cuentas' })
  @IsOptional()
  @IsUUID()
  accountId?: string;
}
