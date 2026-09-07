import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { BankService } from './bank.service';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';
import { ListBanksQueryDto } from './dto/list-banks-query.dto';
import { BankResponseDto } from './dto/bank-response.dto';

@ApiTags('bank-management')
@ApiHeader({ name: 'x-api-key', required: true })
@UseGuards(ApiKeyGuard)
@Controller('banks')
export class BankController {
  constructor(private readonly bankService: BankService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar un nuevo banco soportado por el Collector' })
  async create(@Body() dto: CreateBankDto): Promise<BankResponseDto> {
    const bank = await this.bankService.create(dto);
    return BankResponseDto.fromDomain(bank);
  }

  @Get()
  @ApiOperation({ summary: 'Listar bancos, con filtros opcionales por estado/país' })
  async findAll(@Query() query: ListBanksQueryDto): Promise<BankResponseDto[]> {
    const banks = await this.bankService.findAll(query);
    return banks.map(BankResponseDto.fromDomain);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar un banco por id' })
  async findOne(@Param('id') id: string): Promise<BankResponseDto> {
    const bank = await this.bankService.findById(id);
    return BankResponseDto.fromDomain(bank);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar nombre/país/tipo de integración de un banco' })
  async update(@Param('id') id: string, @Body() dto: UpdateBankDto): Promise<BankResponseDto> {
    const bank = await this.bankService.update(id, dto);
    return BankResponseDto.fromDomain(bank);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activar un banco (vuelve a ser elegible para sincronizar)' })
  async activate(@Param('id') id: string): Promise<BankResponseDto> {
    const bank = await this.bankService.activate(id);
    return BankResponseDto.fromDomain(bank);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Desactivar un banco (el Scheduler dejará de encolar sus cuentas)' })
  async deactivate(@Param('id') id: string): Promise<BankResponseDto> {
    const bank = await this.bankService.deactivate(id);
    return BankResponseDto.fromDomain(bank);
  }
}
