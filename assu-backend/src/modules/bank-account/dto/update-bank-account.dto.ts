import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateBankAccountDto } from './create-bank-account.dto';

/**
 * `bankId` y `merchantId` quedan fuera: cambiar de banco o de dueño no es
 * un "update" simple, es una operación distinta que este módulo no cubre
 * todavía. `credentials` tiene su propio endpoint (`PATCH .../credentials`)
 * porque rotar credenciales tiene una regla de negocio propia (vuelve la
 * cuenta a estado PENDING).
 */
export class UpdateBankAccountDto extends PartialType(
  OmitType(CreateBankAccountDto, ['bankId', 'merchantId', 'credentials'] as const),
) {}
