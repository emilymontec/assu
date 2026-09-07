/**
 * AlertRepository se usa solo como TIPO en el constructor, pero NestJS
 * necesita esa metadata en runtime — sin este mock, Jest arrastraría la
 * cadena real hasta @prisma/client.
 */
jest.mock('./repositories/alert.repository', () => ({ AlertRepository: class {} }));

// eslint-disable-next-line import/first
import { AlertService } from './alert.service';
import { Alert } from '../../core/domain/monitoring/alert.entity';
import { AlertType } from '../../core/domain/monitoring/alert-type.enum';
import { AlertSeverity } from '../../core/domain/monitoring/alert-severity.enum';

function makeAlert(overrides: Partial<{ createdAt: Date }> = {}): Alert {
  return new Alert(
    'alert-1',
    AlertType.ACCOUNT_NOT_SYNCING,
    AlertSeverity.WARNING,
    'mensaje',
    'BankAccount',
    'acc-1',
    null,
    overrides.createdAt ?? new Date(),
  );
}

describe('AlertService', () => {
  const repository = { create: jest.fn(), findLatest: jest.fn(), findMany: jest.fn() };
  const notifier = { notify: jest.fn() };
  const configService = { get: jest.fn() };

  function buildService(): AlertService {
    return new AlertService(repository as any, notifier as any, configService as any);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    configService.get.mockReturnValue(60); // cooldownMinutes por defecto en los tests
    repository.findLatest.mockResolvedValue(null);
  });

  describe('raise()', () => {
    it('persiste y notifica la alerta si no hay una previa reciente (sin cooldown activo)', async () => {
      const service = buildService();

      await service.raise({
        type: AlertType.ACCOUNT_NOT_SYNCING,
        severity: AlertSeverity.WARNING,
        message: 'cuenta caída',
        entityType: 'BankAccount',
        entityId: 'acc-1',
        metadata: { foo: 'bar' },
      });

      expect(repository.create).toHaveBeenCalledWith({
        type: AlertType.ACCOUNT_NOT_SYNCING,
        severity: AlertSeverity.WARNING,
        message: 'cuenta caída',
        entityType: 'BankAccount',
        entityId: 'acc-1',
        metadata: { foo: 'bar' },
      });
      expect(notifier.notify).toHaveBeenCalledTimes(1);
    });

    it('NO repite la alerta si la misma (type + entityId) ya se disparó dentro del cooldown', async () => {
      repository.findLatest.mockResolvedValue(makeAlert({ createdAt: new Date(Date.now() - 5 * 60_000) })); // hace 5 min
      configService.get.mockReturnValue(60); // cooldown de 60 min
      const service = buildService();

      await service.raise({
        type: AlertType.ACCOUNT_NOT_SYNCING,
        severity: AlertSeverity.WARNING,
        message: 'cuenta caída de nuevo',
        entityType: 'BankAccount',
        entityId: 'acc-1',
      });

      expect(repository.create).not.toHaveBeenCalled();
      expect(notifier.notify).not.toHaveBeenCalled();
    });

    it('SÍ repite la alerta si la anterior ya pasó el cooldown', async () => {
      repository.findLatest.mockResolvedValue(makeAlert({ createdAt: new Date(Date.now() - 61 * 60_000) })); // hace 61 min
      configService.get.mockReturnValue(60);
      const service = buildService();

      await service.raise({
        type: AlertType.ACCOUNT_NOT_SYNCING,
        severity: AlertSeverity.WARNING,
        message: 'sigue caída',
        entityType: 'BankAccount',
        entityId: 'acc-1',
      });

      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(notifier.notify).toHaveBeenCalledTimes(1);
    });

    it('NUNCA propaga un error del repositorio o del notifier (no debe tumbar el chequeo que la disparó)', async () => {
      repository.create.mockRejectedValue(new Error('Postgres caído'));
      const service = buildService();

      await expect(
        service.raise({
          type: AlertType.HIGH_ERROR_RATE,
          severity: AlertSeverity.CRITICAL,
          message: 'tasa de errores alta',
          entityType: 'System',
          entityId: null,
        }),
      ).resolves.toBeUndefined();
    });

    it('trata entityId=undefined igual que null para el cooldown y la persistencia', async () => {
      const service = buildService();

      await service.raise({
        type: AlertType.HIGH_ERROR_RATE,
        severity: AlertSeverity.CRITICAL,
        message: 'sin entidad puntual',
        entityType: 'System',
      });

      expect(repository.findLatest).toHaveBeenCalledWith(AlertType.HIGH_ERROR_RATE, null);
      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ entityId: null }));
    });
  });

  describe('findMany()', () => {
    it('delega los filtros en el repositorio', async () => {
      const service = buildService();
      await service.findMany({ type: AlertType.SERVICE_DEGRADED, limit: 10 });

      expect(repository.findMany).toHaveBeenCalledWith({ type: AlertType.SERVICE_DEGRADED, limit: 10 });
    });
  });
});
