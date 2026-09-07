import { ApiProperty } from '@nestjs/swagger';
import { Alert } from '../../../core/domain/monitoring/alert.entity';
import { AlertType } from '../../../core/domain/monitoring/alert-type.enum';
import { AlertSeverity } from '../../../core/domain/monitoring/alert-severity.enum';

export class AlertResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: AlertType }) type!: AlertType;
  @ApiProperty({ enum: AlertSeverity }) severity!: AlertSeverity;
  @ApiProperty() message!: string;
  @ApiProperty() entityType!: string;
  @ApiProperty({ nullable: true }) entityId!: string | null;
  @ApiProperty({ nullable: true, type: Object }) metadata!: Record<string, unknown> | null;
  @ApiProperty() createdAt!: Date;

  static from(alert: Alert): AlertResponseDto {
    const dto = new AlertResponseDto();
    dto.id = alert.id;
    dto.type = alert.type;
    dto.severity = alert.severity;
    dto.message = alert.message;
    dto.entityType = alert.entityType;
    dto.entityId = alert.entityId;
    dto.metadata = alert.metadata;
    dto.createdAt = alert.createdAt;
    return dto;
  }
}
