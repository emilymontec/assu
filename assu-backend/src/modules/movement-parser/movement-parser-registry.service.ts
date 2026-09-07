import { Injectable, Logger } from '@nestjs/common';
import { MovementParserFn } from './movement-parser.types';

/**
 * Mismo patrón que `AdapterRegistryService`: mapea `adapterKey` → función
 * de parseo. Cada banco define su propio parser en `parsers/<banco>.parser.ts`
 * porque el formato crudo que devuelve su adapter es completamente distinto
 * de un banco a otro.
 */
@Injectable()
export class MovementParserRegistryService {
  private readonly logger = new Logger(MovementParserRegistryService.name);
  private readonly parsers = new Map<string, MovementParserFn>();

  register(adapterKey: string, parser: MovementParserFn): void {
    if (this.parsers.has(adapterKey)) {
      this.logger.warn(`Ya había un parser registrado para "${adapterKey}"; se sobreescribe.`);
    }
    this.parsers.set(adapterKey, parser);
  }

  resolve(adapterKey: string): MovementParserFn {
    const parser = this.parsers.get(adapterKey);
    if (!parser) {
      const available = [...this.parsers.keys()].join(', ') || '(ninguno)';
      throw new Error(`No hay ningún parser registrado para "${adapterKey}". Parsers disponibles: ${available}`);
    }
    return parser;
  }
}
