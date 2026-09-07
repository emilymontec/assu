import { ApiProperty } from '@nestjs/swagger';

export class SystemStatusResponseDto {
  @ApiProperty() status!: 'ok' | 'degraded';
  @ApiProperty({ example: { total: 3, ACTIVE: 2, INACTIVE: 1, DEGRADED: 0 } })
  banks!: { total: number; ACTIVE: number; INACTIVE: number; DEGRADED: number };
  @ApiProperty({
    example: { total: 10, PENDING: 1, ACTIVE: 7, REAUTH_REQUIRED: 1, SUSPENDED: 0, ERROR: 1 },
  })
  accounts!: {
    total: number;
    PENDING: number;
    ACTIVE: number;
    REAUTH_REQUIRED: number;
    SUSPENDED: number;
    ERROR: number;
  };
  @ApiProperty({ description: 'Cuentas que necesitan reconexión (REAUTH_REQUIRED), duplicado explícito para dashboards' })
  accountsNeedingReconnection!: number;
  @ApiProperty() timestamp!: string;
}
