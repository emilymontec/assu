/**
 * SyncLogRepository se usa solo como TIPO en el constructor, pero
 * NestJS necesita esa metadata en runtime — sin este mock, Jest
 * arrastraría la cadena real hasta @prisma/client.
 */
jest.mock('./repositories/sync-log.repository', () => ({ SyncLogRepository: class {} }));

// eslint-disable-next-line import/first
import { SyncLogService } from './sync-log.service';
import { SyncStatus } from '../../core/domain/sync/sync-log.entity';

describe('SyncLogService', () => {
  const repository = {
    start: jest.fn(),
    finish: jest.fn(),
    findMany: jest.fn(),
  };

  function buildService() {
    return new SyncLogService(repository as any);
  }

  beforeEach(() => jest.clearAllMocks());

  it('start() delega en el repositorio', async () => {
    const service = buildService();
    await service.start('acc-1');

    expect(repository.start).toHaveBeenCalledWith('acc-1');
  });

  it('finish() delega en el repositorio con los datos de cierre', async () => {
    const service = buildService();
    await service.finish('log-1', { status: SyncStatus.SUCCESS, movementsFound: 5, movementsNew: 2 });

    expect(repository.finish).toHaveBeenCalledWith('log-1', {
      status: SyncStatus.SUCCESS,
      movementsFound: 5,
      movementsNew: 2,
    });
  });

  it('findMany() sin accountId trae historial de todas las cuentas', async () => {
    const service = buildService();
    await service.findMany({});

    expect(repository.findMany).toHaveBeenCalledWith({});
  });

  it('findMany() con accountId filtra por esa cuenta', async () => {
    const service = buildService();
    await service.findMany({ accountId: 'acc-1', limit: 5 });

    expect(repository.findMany).toHaveBeenCalledWith({ accountId: 'acc-1', limit: 5 });
  });

  describe('countConsecutiveFailures()', () => {
    it('cuenta los fallos seguidos desde el más reciente', async () => {
      repository.findMany.mockResolvedValue([
        { status: SyncStatus.FAILED },
        { status: SyncStatus.FAILED },
        { status: SyncStatus.SUCCESS },
        { status: SyncStatus.FAILED },
      ]);
      const service = buildService();

      expect(await service.countConsecutiveFailures('acc-1')).toBe(2);
    });

    it('devuelve 0 si el intento más reciente fue exitoso', async () => {
      repository.findMany.mockResolvedValue([{ status: SyncStatus.SUCCESS }, { status: SyncStatus.FAILED }]);
      const service = buildService();

      expect(await service.countConsecutiveFailures('acc-1')).toBe(0);
    });

    it('devuelve 0 si no hay historial', async () => {
      repository.findMany.mockResolvedValue([]);
      const service = buildService();

      expect(await service.countConsecutiveFailures('acc-1')).toBe(0);
    });
  });
});
