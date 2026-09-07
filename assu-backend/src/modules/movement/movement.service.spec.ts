import { NotFoundException } from '@nestjs/common';
import { MovementService } from './movement.service';
import { MovementRepositoryPort } from '../../core/ports/movement-repository.port';
import { Movement } from '../../core/domain/movement/movement.entity';
import { MovementStatus } from '../../core/domain/movement/movement-status.enum';
import { MovementType } from '../../core/domain/movement/movement-type.enum';

function makeMovement(overrides: Partial<{ id: string }> = {}): Movement {
  return new Movement(
    overrides.id ?? 'mov-1',
    'acc-1',
    'ref-1',
    10000,
    'COP',
    null,
    null,
    MovementType.UNKNOWN,
    new Date(),
    MovementStatus.VALID,
    false,
    { raw: true },
    new Date(),
  );
}

describe('MovementService', () => {
  const repository: jest.Mocked<MovementRepositoryPort> = {
    create: jest.fn(),
    existsByFingerprint: jest.fn(),
    findMany: jest.fn(),
    findById: jest.fn(),
  };

  function buildService() {
    return new MovementService(repository);
  }

  beforeEach(() => jest.clearAllMocks());

  it('create() delega en el repositorio', async () => {
    const movement = makeMovement();
    repository.create.mockResolvedValue(movement);
    const service = buildService();

    const result = await service.create(movement);

    expect(repository.create).toHaveBeenCalledWith(movement);
    expect(result).toBe(movement);
  });

  it('findAll() pasa los filtros tal cual al repositorio', async () => {
    repository.findMany.mockResolvedValue([makeMovement()]);
    const service = buildService();

    await service.findAll({ accountId: 'acc-1' });

    expect(repository.findMany).toHaveBeenCalledWith({ accountId: 'acc-1' });
  });

  it('findById() lanza NotFoundException si no existe', async () => {
    repository.findById.mockResolvedValue(null);
    const service = buildService();

    await expect(service.findById('no-existe')).rejects.toThrow(NotFoundException);
  });

  it('findById() devuelve el movimiento si existe', async () => {
    const movement = makeMovement();
    repository.findById.mockResolvedValue(movement);
    const service = buildService();

    expect(await service.findById('mov-1')).toBe(movement);
  });
});
