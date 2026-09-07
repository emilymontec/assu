import { ApiProperty } from '@nestjs/swagger';
import { SyncLog, SyncStatus } from '../../../core/domain/sync/sync-log.entity';

export class SyncLogResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() accountId!: string;
  @ApiProperty() startedAt!: Date;
  @ApiProperty({ nullable: true }) finishedAt!: Date | null;
  @ApiProperty({ enum: SyncStatus }) status!: SyncStatus;
  @ApiProperty({ nullable: true }) error!: string | null;
  @ApiProperty() movementsFound!: number;
  @ApiProperty() movementsNew!: number;
  @ApiProperty({ nullable: true }) durationMs!: number | null;

  static from(log: SyncLog): SyncLogResponseDto {
    const dto = new SyncLogResponseDto();
    dto.id = log.id;
    dto.accountId = log.accountId;
    dto.startedAt = log.startedAt;
    dto.finishedAt = log.finishedAt;
    dto.status = log.status;
    dto.error = log.error;
    dto.movementsFound = log.movementsFound;
    dto.movementsNew = log.movementsNew;
    dto.durationMs = log.durationMs;
    return dto;
  }
}
