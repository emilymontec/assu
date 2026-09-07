import { ApiProperty } from '@nestjs/swagger';
import { AccountStatus } from '../../../core/domain/bank-account/account-status.enum';
import { SyncStatus } from '../../../core/domain/sync/sync-log.entity';

export class LastSyncResponseDto {
  @ApiProperty() accountId!: string;
  @ApiProperty() bankName!: string;
  @ApiProperty({ enum: AccountStatus }) status!: AccountStatus;
  @ApiProperty() syncEnabled!: boolean;
  @ApiProperty({ nullable: true }) lastSyncAt!: Date | null;
  @ApiProperty({ nullable: true }) lastMovementReference!: string | null;
  @ApiProperty({ enum: SyncStatus, nullable: true, description: 'Estado del último intento registrado en Sync Log' })
  lastSyncStatus!: SyncStatus | null;
  @ApiProperty({ nullable: true }) lastSyncError!: string | null;
  @ApiProperty({ nullable: true }) lastSyncDurationMs!: number | null;
}
