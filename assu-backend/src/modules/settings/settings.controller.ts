import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { SettingsService } from './settings.service';
import { SystemSettingsResponseDto } from './dto/system-settings-response.dto';

/** Cubre "revisar configuración" de Admin/Operations (módulo 23). Solo lectura. */
@ApiTags('settings')
@ApiHeader({ name: 'x-api-key', required: true })
@UseGuards(ApiKeyGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Configuración operativa vigente de Assu (sin secretos)' })
  getSettings(): SystemSettingsResponseDto {
    return this.settingsService.getSettings();
  }
}
