import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { BankAccountService } from './bank-account.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { UpdateCredentialsDto } from './dto/update-credentials.dto';
import { ListBankAccountsQueryDto } from './dto/list-bank-accounts-query.dto';
import { BankAccountResponseDto } from './dto/bank-account-response.dto';

@ApiTags('bank-account-management')
@ApiHeader({ name: 'x-api-key', required: true })
@UseGuards(ApiKeyGuard)
@Controller('bank-accounts')
export class BankAccountController {
  constructor(private readonly bankAccountService: BankAccountService) {}

  @Post()
  @ApiOperation({ summary: 'Conectar una nueva cuenta bancaria de un merchant' })
  async create(@Body() dto: CreateBankAccountDto): Promise<BankAccountResponseDto> {
    const { account, bankName } = await this.bankAccountService.create(dto);
    return BankAccountResponseDto.from(account, bankName);
  }

  @Get()
  @ApiOperation({ summary: 'Listar cuentas, con filtros por banco/merchant/estado' })
  async findAll(@Query() query: ListBankAccountsQueryDto): Promise<BankAccountResponseDto[]> {
    const records = await this.bankAccountService.findAll(query);
    return records.map(({ account, bankName }) => BankAccountResponseDto.from(account, bankName));
  }

  // IMPORTANTE: debe ir ANTES de ':id', o Nest interpretaría "needing-reconnection" como un id.
  @Get('needing-reconnection')
  @ApiOperation({ summary: 'Listar cuentas que requieren reautenticación (REAUTH_REQUIRED)' })
  async findNeedingReconnection(): Promise<BankAccountResponseDto[]> {
    const records = await this.bankAccountService.findNeedingReconnection();
    return records.map(({ account, bankName }) => BankAccountResponseDto.from(account, bankName));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar una cuenta por id' })
  async findOne(@Param('id') id: string): Promise<BankAccountResponseDto> {
    const { account, bankName } = await this.bankAccountService.findById(id);
    return BankAccountResponseDto.from(account, bankName);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar el número de cuenta' })
  async update(@Param('id') id: string, @Body() dto: UpdateBankAccountDto): Promise<BankAccountResponseDto> {
    const { account, bankName } = await this.bankAccountService.update(id, dto);
    return BankAccountResponseDto.from(account, bankName);
  }

  @Patch(':id/credentials')
  @ApiOperation({ summary: 'Rotar credenciales (la cuenta vuelve a estado PENDING)' })
  async updateCredentials(
    @Param('id') id: string,
    @Body() dto: UpdateCredentialsDto,
  ): Promise<BankAccountResponseDto> {
    const { account, bankName } = await this.bankAccountService.updateCredentials(id, dto);
    return BankAccountResponseDto.from(account, bankName);
  }

  @Patch(':id/enable-sync')
  @ApiOperation({ summary: 'Habilitar sincronización automática para esta cuenta' })
  async enableSync(@Param('id') id: string): Promise<BankAccountResponseDto> {
    const { account, bankName } = await this.bankAccountService.enableSync(id);
    return BankAccountResponseDto.from(account, bankName);
  }

  @Patch(':id/disable-sync')
  @ApiOperation({ summary: 'Deshabilitar sincronización automática para esta cuenta' })
  async disableSync(@Param('id') id: string): Promise<BankAccountResponseDto> {
    const { account, bankName } = await this.bankAccountService.disableSync(id);
    return BankAccountResponseDto.from(account, bankName);
  }

  @Patch(':id/suspend')
  @ApiOperation({ summary: 'Suspender la cuenta manualmente' })
  async suspend(@Param('id') id: string): Promise<BankAccountResponseDto> {
    const { account, bankName } = await this.bankAccountService.suspend(id);
    return BankAccountResponseDto.from(account, bankName);
  }

  @Patch(':id/reactivate')
  @ApiOperation({ summary: 'Reactivar la cuenta (bloqueado si requiere reautenticación)' })
  async reactivate(@Param('id') id: string): Promise<BankAccountResponseDto> {
    const { account, bankName } = await this.bankAccountService.reactivate(id);
    return BankAccountResponseDto.from(account, bankName);
  }

  @Post(':id/sync')
  @ApiOperation({
    summary: 'Solicitar sincronización manual (responde 501: pendiente de Sync Engine + Queue)',
  })
  async requestManualSync(@Param('id') id: string): Promise<void> {
    await this.bankAccountService.requestManualSync(id);
  }
}
