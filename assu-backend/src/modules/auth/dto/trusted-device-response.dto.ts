import { ApiProperty } from '@nestjs/swagger';

export class TrustedDeviceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'Chrome en Windows' }) label!: string;
  @ApiProperty() lastUsedAt!: Date;
  @ApiProperty() createdAt!: Date;
}
