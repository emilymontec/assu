import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { MovementService } from './movement.service';
import { ListMovementsQueryDto } from './dto/list-movements-query.dto';
import { MovementResponseDto } from './dto/movement-response.dto';

@ApiTags('movement-management')
@ApiHeader({ name: 'x-api-key', required: true })
@UseGuards(ApiKeyGuard)
@Controller('movements')
export class MovementController {
  constructor(private readonly movementService: MovementService) {}

  @Get()
  @ApiOperation({ summary: 'Listar movimientos, con filtros por cuenta/fecha/estado/verificado' })
  async findAll(@Query() query: ListMovementsQueryDto): Promise<MovementResponseDto[]> {
    const movements = await this.movementService.findAll(query);
    return movements.map(MovementResponseDto.from);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar un movimiento por id' })
  async findOne(@Param('id') id: string): Promise<MovementResponseDto> {
    const movement = await this.movementService.findById(id);
    return MovementResponseDto.from(movement);
  }
}
