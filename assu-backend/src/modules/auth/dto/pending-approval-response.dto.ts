import { ApiProperty } from '@nestjs/swagger';

export class PendingApprovalResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'Chrome en Windows' }) newDeviceLabel!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() expiresAt!: Date;
}
