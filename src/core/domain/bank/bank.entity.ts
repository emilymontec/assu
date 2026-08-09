import { BankStatus, CollectorType } from './bank-status.enum';

/**
 * Entidad de dominio pura. No conoce Prisma, NestJS ni HTTP.
 * Representa una entidad financiera soportada por el Collector.
 */
export class Bank {
  constructor(
    public readonly id: string,
    public name: string,
    public country: string,
    public status: BankStatus,
    public collectorType: CollectorType,
    /**
     * Identificador lógico usado por el AdapterRegistry para resolver
     * la clase concreta del adaptador (ej: "nequi", "bancolombia").
     */
    public adapterKey: string,
    public readonly createdAt: Date,
    public updatedAt: Date = new Date(),
  ) {}

  isAvailable(): boolean {
    return this.status === BankStatus.ACTIVE;
  }

  deactivate(): void {
    this.status = BankStatus.INACTIVE;
    this.updatedAt = new Date();
  }

  activate(): void {
    this.status = BankStatus.ACTIVE;
    this.updatedAt = new Date();
  }

  markDegraded(): void {
    this.status = BankStatus.DEGRADED;
    this.updatedAt = new Date();
  }
}
