import { MovementParserRegistryService } from './movement-parser-registry.service';
import { ParsedMovementFields } from './movement-parser.types';
import { MovementType } from '../../core/domain/movement/movement-type.enum';

const fakeParser = (): ParsedMovementFields => ({
  reference: 'ref',
  amount: 100,
  currency: 'COP',
  sender: null,
  receiver: null,
  movementType: MovementType.UNKNOWN,
  date: new Date(),
});

describe('MovementParserRegistryService', () => {
  it('registra y resuelve un parser por adapterKey', () => {
    const registry = new MovementParserRegistryService();
    registry.register('nequi', fakeParser);

    expect(registry.resolve('nequi')).toBe(fakeParser);
  });

  it('lanza un error claro si el adapterKey no tiene parser registrado', () => {
    const registry = new MovementParserRegistryService();

    expect(() => registry.resolve('inexistente')).toThrow(/no hay ningún parser registrado/i);
  });
});
