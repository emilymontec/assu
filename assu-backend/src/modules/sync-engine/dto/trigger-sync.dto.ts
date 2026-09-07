import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TriggerSyncDto {
  @ApiProperty()
  @IsUUID()
  accountId!: string;
}
