import { Injectable } from '@nestjs/common';
import { MovementParserRegistryService } from './movement-parser-registry.service';
import { ParsedMovementFields } from './movement-parser.types';
import { RawMovement } from '../../core/domain/movement/movement.entity';

@Injectable()
export class MovementParserService {
  constructor(private readonly registry: MovementParserRegistryService) {}

  /** Cubre "parsear respuesta del banco" + "extraer movimientos". `raw` se conserva sin tocar en Sync Engine (rawData). */
  parse(adapterKey: string, raw: RawMovement): ParsedMovementFields {
    const parser = this.registry.resolve(adapterKey);
    return parser(raw);
  }
}
