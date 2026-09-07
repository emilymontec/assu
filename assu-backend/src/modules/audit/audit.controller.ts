import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { AuditService } from './audit.service';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';

@ApiTags('audit')
@ApiHeader({ name: 'x-api-key', required: true })
@UseGuards(ApiKeyGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({
    summary: 'Historial de auditoría (logins, syncs, cambios de config, operaciones administrativas)',
  })
  async findAll(@Query() query: ListAuditLogsQueryDto): Promise<AuditLogResponseDto[]> {
    const logs = await this.auditService.findMany(query);
    return logs.map(AuditLogResponseDto.from);
  }
}
