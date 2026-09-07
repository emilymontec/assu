import { ApiProperty } from '@nestjs/swagger';
import { AuditLog } from '../../../core/domain/audit/audit-log.entity';
import { AuditAction } from '../../../core/domain/audit/audit-action.enum';
import { AuditResult } from '../../../core/domain/audit/audit-result.enum';

export class AuditLogResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: AuditAction }) action!: AuditAction;
  @ApiProperty() actor!: string;
  @ApiProperty() entityType!: string;
  @ApiProperty({ nullable: true }) entityId!: string | null;
  @ApiProperty({ enum: AuditResult }) result!: AuditResult;
  @ApiProperty({ nullable: true, type: Object }) metadata!: Record<string, unknown> | null;
  @ApiProperty({ nullable: true }) errorMessage!: string | null;
  @ApiProperty() createdAt!: Date;

  static from(log: AuditLog): AuditLogResponseDto {
    const dto = new AuditLogResponseDto();
    dto.id = log.id;
    dto.action = log.action;
    dto.actor = log.actor;
    dto.entityType = log.entityType;
    dto.entityId = log.entityId;
    dto.result = log.result;
    dto.metadata = log.metadata;
    dto.errorMessage = log.errorMessage;
    dto.createdAt = log.createdAt;
    return dto;
  }
}
