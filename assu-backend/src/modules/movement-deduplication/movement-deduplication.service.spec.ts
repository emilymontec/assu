import { MovementDeduplicationService } from './movement-deduplication.service';
import { MovementRepositoryPort } from '../../core/ports/movement-repository.port';

describe('MovementDeduplicationService', () => {
  const repository: jest.Mocked<MovementRepositoryPort> = {
    create: jest.fn(),
    existsByFingerprint: jest.fn(),
    findMany: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('delega directamente en existsByFingerprint del repositorio', async () => {
    repository.existsByFingerprint.mockResolvedValue(true);
    const service = new MovementDeduplicationService(repository);
    const date = new Date();

    const result = await service.isDuplicate('acc-1', 'ref-1', 10000, date);

    expect(repository.existsByFingerprint).toHaveBeenCalledWith('acc-1', 'ref-1', 10000, date);
    expect(result).toBe(true);
  });

  it('funciona igual con referencia vacía (la clave compuesta hace el trabajo)', async () => {
    repository.existsByFingerprint.mockResolvedValue(false);
    const service = new MovementDeduplicationService(repository);
    const date = new Date();

    const result = await service.isDuplicate('acc-1', '', 5000, date);

    expect(repository.existsByFingerprint).toHaveBeenCalledWith('acc-1', '', 5000, date);
    expect(result).toBe(false);
  });
});
