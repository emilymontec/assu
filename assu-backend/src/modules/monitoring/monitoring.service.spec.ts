/**
 * BankAccountService, SyncLogService, AlertService y PrismaService se
 * usan solo como TIPOS en el constructor, pero NestJS necesita esa
 * metadata en runtime — sin estos mocks, Jest arrastraría la cadena real
 * hasta @prisma/client.
 */
jest.mock('../bank-account/bank-account.service', () => ({ BankAccountService: class {} }));
jest.mock('../sync-log/sync-log.service', () => ({ SyncLogService: class {} }));
jest.mock('./alert.service', () => ({ AlertService: class {} }));
jest.mock('../../database/prisma.service', () => ({ PrismaService: class {} }));

// eslint-disable-next-line import/first
import { MonitoringService } from './monitoring.service';
import { BankAccount } from '../../core/domain/bank-account/bank-account.entity';
import { AccountStatus } from '../../core/domain/bank-account/account-status.enum';
import { SyncLog, SyncStatus } from '../../core/domain/sync/sync-log.entity';
import { AlertType } from '../../core/domain/monitoring/alert-type.enum';
import { AlertSeverity } from '../../core/domain/monitoring/alert-severity.enum';

function makeAccount(overrides: Partial<{ lastSyncAt: Date | null; syncEnabled: boolean; syncIntervalSeconds: number }> = {}): BankAccount {
  return new BankAccount(
    'acc-1',
    'bank-1',
    'merchant-1',
    '3001234567',
    'fp:ct',
    AccountStatus.ACTIVE,
    overrides.syncEnabled ?? true,
    overrides.syncIntervalSeconds ?? 60,
    overrides.lastSyncAt === undefined ? new Date() : overrides.lastSyncAt,
    null,
    new Date(),
    new Date(),
  );
}

function makeSyncLog(status: SyncStatus): SyncLog {
  return new SyncLog('log-1', 'acc-1', new Date(), new Date(), status, null, 1, 1);
}

describe('MonitoringService', () => {
  const bankAccountService = { findAll: jest.fn() };
  const syncLogService = { findMany: jest.fn() };
  const alertService = { raise: jest.fn() };
  const configService = { get: jest.fn() };
  const prisma = { $queryRaw: jest.fn() };
  const redis = { ping: jest.fn() };

  function buildService(): MonitoringService {
    return new MonitoringService(
      bankAccountService as any,
      syncLogService as any,
      alertService as any,
      configService as any,
      prisma as any,
      redis as any,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    configService.get.mockImplementation((key: string) => {
      const defaults: Record<string, number> = {
        'monitoring.accountStaleThresholdMinutes': 30,
        'monitoring.errorRateWindowMinutes': 15,
        'monitoring.errorRateThreshold': 0.5,
        'monitoring.errorRateMinSampleSize': 3,
      };
      return defaults[key];
    });
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    redis.ping.mockResolvedValue('PONG');
  });

  describe('checkStaleAccounts()', () => {
    it('alerta una cuenta ACTIVA cuyo último sync supera el umbral configurado', async () => {
      const staleDate = new Date(Date.now() - 45 * 60_000); // 45 min, > 30 configurados
      bankAccountService.findAll.mockResolvedValue([{ account: makeAccount({ lastSyncAt: staleDate }), bankName: 'Nequi' }]);
      const service = buildService();

      await service.checkStaleAccounts();

      expect(alertService.raise).toHaveBeenCalledWith(
        expect.objectContaining({ type: AlertType.ACCOUNT_NOT_SYNCING, entityId: 'acc-1' }),
      );
    });

    it('NO alerta una cuenta dentro del umbral', async () => {
      const recentDate = new Date(Date.now() - 5 * 60_000);
      bankAccountService.findAll.mockResolvedValue([{ account: makeAccount({ lastSyncAt: recentDate }), bankName: 'Nequi' }]);
      const service = buildService();

      await service.checkStaleAccounts();

      expect(alertService.raise).not.toHaveBeenCalled();
    });

    it('ignora cuentas con syncEnabled=false', async () => {
      const staleDate = new Date(Date.now() - 90 * 60_000);
      bankAccountService.findAll.mockResolvedValue([
        { account: makeAccount({ lastSyncAt: staleDate, syncEnabled: false }), bankName: 'Nequi' },
      ]);
      const service = buildService();

      await service.checkStaleAccounts();

      expect(alertService.raise).not.toHaveBeenCalled();
    });

    it('usa 3x el intervalo propio de la cuenta si es mayor al umbral global configurado', async () => {
      // Umbral global: 30 min. Intervalo de la cuenta: 20 min → 3x = 60 min.
      // A los 45 min NO debería alertar todavía (menor a 60), aunque supere el umbral global de 30.
      const almostStale = new Date(Date.now() - 45 * 60_000);
      bankAccountService.findAll.mockResolvedValue([
        { account: makeAccount({ lastSyncAt: almostStale, syncIntervalSeconds: 20 * 60 }), bankName: 'Nequi' },
      ]);
      const service = buildService();

      await service.checkStaleAccounts();

      expect(alertService.raise).not.toHaveBeenCalled();
    });

    it('usa createdAt como referencia si la cuenta nunca ha sincronizado', async () => {
      const account = makeAccount({ lastSyncAt: null });
      (account as any).createdAt = new Date(Date.now() - 40 * 60_000);
      bankAccountService.findAll.mockResolvedValue([{ account, bankName: 'Nequi' }]);
      const service = buildService();

      await service.checkStaleAccounts();

      expect(alertService.raise).toHaveBeenCalledWith(expect.objectContaining({ type: AlertType.ACCOUNT_NOT_SYNCING }));
    });
  });

  describe('checkHighErrorRate()', () => {
    it('alerta si la tasa de fallos supera el umbral con muestra suficiente', async () => {
      syncLogService.findMany.mockResolvedValue([
        makeSyncLog(SyncStatus.FAILED),
        makeSyncLog(SyncStatus.FAILED),
        makeSyncLog(SyncStatus.SUCCESS),
      ]); // 2/3 = 66% >= 50%
      const service = buildService();

      await service.checkHighErrorRate();

      expect(alertService.raise).toHaveBeenCalledWith(
        expect.objectContaining({ type: AlertType.HIGH_ERROR_RATE, entityType: 'System' }),
      );
    });

    it('NO alerta si la muestra es menor al mínimo configurado, aunque la tasa sea 100%', async () => {
      syncLogService.findMany.mockResolvedValue([makeSyncLog(SyncStatus.FAILED)]); // solo 1 muestra, mínimo es 3
      const service = buildService();

      await service.checkHighErrorRate();

      expect(alertService.raise).not.toHaveBeenCalled();
    });

    it('NO alerta si la tasa de fallos está por debajo del umbral', async () => {
      syncLogService.findMany.mockResolvedValue([
        makeSyncLog(SyncStatus.SUCCESS),
        makeSyncLog(SyncStatus.SUCCESS),
        makeSyncLog(SyncStatus.FAILED),
      ]); // 1/3 = 33% < 50%
      const service = buildService();

      await service.checkHighErrorRate();

      expect(alertService.raise).not.toHaveBeenCalled();
    });

    it('ignora los logs todavía RUNNING al calcular la tasa', async () => {
      syncLogService.findMany.mockResolvedValue([
        makeSyncLog(SyncStatus.FAILED),
        makeSyncLog(SyncStatus.FAILED),
        makeSyncLog(SyncStatus.RUNNING),
        makeSyncLog(SyncStatus.RUNNING),
      ]); // finished: 2, failed: 2 → 100%, pero muestra finished es 2 < mínimo 3
      const service = buildService();

      await service.checkHighErrorRate();

      expect(alertService.raise).not.toHaveBeenCalled();
    });
  });

  describe('checkInfrastructureHealth()', () => {
    it('no alerta nada si Postgres y Redis responden', async () => {
      const service = buildService();

      await service.checkInfrastructureHealth();

      expect(alertService.raise).not.toHaveBeenCalled();
    });

    it('alerta SERVICE_DEGRADED si Postgres no responde', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('conexión rechazada'));
      const service = buildService();

      await service.checkInfrastructureHealth();

      expect(alertService.raise).toHaveBeenCalledWith(
        expect.objectContaining({ type: AlertType.SERVICE_DEGRADED, entityId: 'postgres' }),
      );
    });

    it('alerta SERVICE_DEGRADED si Redis no responde (sesiones caídas)', async () => {
      redis.ping.mockRejectedValue(new Error('ECONNREFUSED'));
      const service = buildService();

      await service.checkInfrastructureHealth();

      expect(alertService.raise).toHaveBeenCalledWith(
        expect.objectContaining({ type: AlertType.SERVICE_DEGRADED, entityId: 'redis', severity: AlertSeverity.CRITICAL }),
      );
    });

    it('revisa Redis aunque Postgres ya haya fallado (chequeos independientes)', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('conexión rechazada'));
      redis.ping.mockRejectedValue(new Error('ECONNREFUSED'));
      const service = buildService();

      await service.checkInfrastructureHealth();

      expect(alertService.raise).toHaveBeenCalledTimes(2);
    });
  });

  describe('runChecks()', () => {
    it('corre los 3 chequeos aunque uno falle (aislados entre sí)', async () => {
      bankAccountService.findAll.mockRejectedValue(new Error('Postgres lento'));
      syncLogService.findMany.mockResolvedValue([]);
      const service = buildService();

      await service.runChecks();

      // checkStaleAccounts explotó, pero checkInfrastructureHealth igual corrió:
      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(redis.ping).toHaveBeenCalled();
    });
  });
});
