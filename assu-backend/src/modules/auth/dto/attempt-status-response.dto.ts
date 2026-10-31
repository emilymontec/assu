import { ApiProperty } from '@nestjs/swagger';

export type AttemptStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED';

export class AttemptStatusResponseDto {
  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'DENIED', 'EXPIRED'] })
  status!: AttemptStatus;
}
