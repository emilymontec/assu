import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { AlertService } from './alert.service';
import { ListAlertsQueryDto } from './dto/list-alerts-query.dto';
import { AlertResponseDto } from './dto/alert-response.dto';

@ApiTags('monitoring')
@ApiHeader({ name: 'x-api-key', required: true })
@UseGuards(ApiKeyGuard)
@Controller('alerts')
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  @Get()
  @ApiOperation({ summary: 'Historial de alertas operativas (cuentas caídas, tasa de errores, infraestructura)' })
  async findAll(@Query() query: ListAlertsQueryDto): Promise<AlertResponseDto[]> {
    const alerts = await this.alertService.findMany(query);
    return alerts.map(AlertResponseDto.from);
  }
}
