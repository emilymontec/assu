import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { SyncLogService } from './sync-log.service';
import { ListSyncLogsQueryDto } from './dto/list-sync-logs-query.dto';
import { SyncLogResponseDto } from './dto/sync-log-response.dto';

@ApiTags('sync-log')
@ApiHeader({ name: 'x-api-key', required: true })
@UseGuards(ApiKeyGuard)
@Controller('sync-logs')
export class SyncLogController {
  constructor(private readonly syncLogService: SyncLogService) {}

  @Get()
  @ApiOperation({ summary: 'Historial de sincronizaciones, opcionalmente filtrado por cuenta' })
  async findAll(@Query() query: ListSyncLogsQueryDto): Promise<SyncLogResponseDto[]> {
    const logs = await this.syncLogService.findMany(query);
    return logs.map(SyncLogResponseDto.from);
  }
}
