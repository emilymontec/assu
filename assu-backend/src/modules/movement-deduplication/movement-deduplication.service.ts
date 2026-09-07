import { Inject, Injectable } from '@nestjs/common';
import { MOVEMENT_REPOSITORY_PORT, MovementRepositoryPort } from '../../core/ports/movement-repository.port';

@Injectable()
export class MovementDeduplicationService {
  constructor(@Inject(MOVEMENT_REPOSITORY_PORT) private readonly repository: MovementRepositoryPort) {}

  /**
   * Cubre "detectar duplicados" + "comparar con existentes" +
   * "manejar referencias vacías": la clave compuesta (cuenta + referencia +
   * monto + fecha) ya resuelve el caso de referencia vacía sin lógica
   * especial — dos movimientos sin referencia solo se consideran
   * duplicados entre sí si ADEMÁS coinciden en monto y fecha exactos, que
   * es exactamente el comportamiento deseado (ver `Movement.fingerprint()`
   * en el dominio y el índice único en `schema.prisma`).
   */
  async isDuplicate(accountId: string, reference: string, amount: number, date: Date): Promise<boolean> {
    return this.repository.existsByFingerprint(accountId, reference, amount, date);
  }
}
