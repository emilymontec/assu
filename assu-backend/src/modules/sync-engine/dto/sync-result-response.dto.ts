import { ApiProperty } from '@nestjs/swagger';
import { SyncResult } from '../sync-engine.service';

export class SyncResultResponseDto {
  @ApiProperty() accountId!: string;
  @ApiProperty() movementsFound!: number;
  @ApiProperty() movementsNew!: number;

  static from(accountId: string, result: SyncResult): SyncResultResponseDto {
    const dto = new SyncResultResponseDto();
    dto.accountId = accountId;
    dto.movementsFound = result.movementsFound;
    dto.movementsNew = result.movementsNew;
    return dto;
  }
}
