import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BankRepository } from './repositories/bank.repository';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';
import { ListBanksQueryDto } from './dto/list-banks-query.dto';
import { Bank } from '../../core/domain/bank/bank.entity';
import { BankStatus } from '../../core/domain/bank/bank-status.enum';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class BankService {
  constructor(
    private readonly bankRepository: BankRepository,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateBankDto): Promise<Bank> {
    const existing = await this.bankRepository.findByAdapterKey(dto.adapterKey);
    if (existing) {
      throw new ConflictException(`Ya existe un banco registrado con adapterKey "${dto.adapterKey}"`);
    }
    return this.bankRepository.create(dto);
  }

  async findAll(query: ListBanksQueryDto): Promise<Bank[]> {
    return this.bankRepository.findAll(query);
  }

  /** Usado por Scheduler/Sync Engine (módulos 6/7) para saber qué bancos pueden sincronizarse. */
  async findAvailable(): Promise<Bank[]> {
    return this.bankRepository.findAll({ status: BankStatus.ACTIVE });
  }

  async findById(id: string): Promise<Bank> {
    const bank = await this.bankRepository.findById(id);
    if (!bank) {
      throw new NotFoundException(`Banco ${id} no encontrado`);
    }
    return bank;
  }

  async update(id: string, dto: UpdateBankDto): Promise<Bank> {
    await this.findById(id); // valida existencia, lanza 404 si no existe
    const bank = await this.bankRepository.update(id, dto);
    await this.auditService.logConfigChange('Bank', id, 'api', { ...dto });
    return bank;
  }

  async activate(id: string): Promise<Bank> {
    await this.findById(id);
    const bank = await this.bankRepository.updateStatus(id, BankStatus.ACTIVE);
    await this.auditService.logConfigChange('Bank', id, 'api', { status: BankStatus.ACTIVE });
    return bank;
  }

  async deactivate(id: string): Promise<Bank> {
    await this.findById(id);
    const bank = await this.bankRepository.updateStatus(id, BankStatus.INACTIVE);
    await this.auditService.logConfigChange('Bank', id, 'api', { status: BankStatus.INACTIVE });
    return bank;
  }
}
