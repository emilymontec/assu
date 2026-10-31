import { ApiProperty } from '@nestjs/swagger';
import { NotificationRecord } from '../repositories/notification.repository';
import { NotificationType } from '../../../core/domain/notification/notification-type.enum';

export class NotificationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: NotificationType }) type!: NotificationType;
  @ApiProperty() message!: string;
  @ApiProperty({ nullable: true }) metadata!: Record<string, unknown> | null;
  @ApiProperty() read!: boolean;
  @ApiProperty() createdAt!: Date;

  static from(record: NotificationRecord): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = record.id;
    dto.type = record.type;
    dto.message = record.message;
    dto.metadata = record.metadata;
    dto.read = record.readAt !== null;
    dto.createdAt = record.createdAt;
    return dto;
  }
}
