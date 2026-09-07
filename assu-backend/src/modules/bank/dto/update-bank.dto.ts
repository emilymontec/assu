import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateBankDto } from './create-bank.dto';

/**
 * `adapterKey` queda excluido a propósito: cambiarlo rompería el mapeo
 * que hace el AdapterRegistry (módulo 3) entre este banco y su clase
 * concreta. Si un banco necesita cambiar de adapter, se maneja como una
 * operación explícita separada, no como un update genérico.
 */
export class UpdateBankDto extends PartialType(OmitType(CreateBankDto, ['adapterKey'] as const)) {}
