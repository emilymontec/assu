import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { StatusService } from './status.service';
import { SystemStatusResponseDto } from './dto/system-status-response.dto';
import { LastSyncQueryDto } from './dto/last-sync-query.dto';
import { LastSyncResponseDto } from './dto/last-sync-response.dto';

/** Cubre "Estado" y "Última sincronización" de Internal API (módulo 19). */
@ApiTags('status')
@ApiHeader({ name: 'x-api-key', required: true })
@UseGuards(ApiKeyGuard)
@Controller()
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Get('status')
  @ApiOperation({ summary: 'Estado general del sistema: bancos y cuentas agregados por estado' })
  async getStatus(): Promise<SystemStatusResponseDto> {
    return this.statusService.getSystemStatus();
  }

  @Get('last-sync')
  @ApiOperation({
    summary: 'Última sincronización de una cuenta (con ?accountId=) o resumen de todas (sin parámetros)',
  })
  async getLastSync(@Query() query: LastSyncQueryDto): Promise<LastSyncResponseDto | LastSyncResponseDto[]> {
    if (query.accountId) {
      return this.statusService.getLastSyncForAccount(query.accountId);
    }
    return this.statusService.getLastSyncOverview();
  }
}
