import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { SyncEngineService } from './sync-engine.service';
import { TriggerSyncDto } from './dto/trigger-sync.dto';
import { SyncResultResponseDto } from './dto/sync-result-response.dto';

/**
 * Cubre `POST /api/sync` del roadmap (Internal API, módulo 19).
 *
 * Nota de arquitectura: esto NO vive en el controller de Bank Account
 * Management aunque ahí también hay un endpoint de "sync manual"
 * (`POST /bank-accounts/:id/sync`, que solo valida reglas de negocio y
 * responde 501). BankAccountModule no puede importar SyncEngineModule sin
 * crear una dependencia circular (SyncEngineModule ya importa
 * BankAccountModule) — así que la ejecución real del sync vive aquí.
 */
@ApiTags('sync-engine')
@ApiHeader({ name: 'x-api-key', required: true })
@UseGuards(ApiKeyGuard)
@Controller('sync')
export class SyncEngineController {
  constructor(private readonly syncEngineService: SyncEngineService) {}

  @Post()
  @ApiOperation({ summary: 'Forzar sincronización manual de una cuenta (ejecuta el flujo completo)' })
  async trigger(@Body() dto: TriggerSyncDto): Promise<SyncResultResponseDto> {
    const result = await this.syncEngineService.syncAccount(dto.accountId);
    return SyncResultResponseDto.from(dto.accountId, result);
  }
}
