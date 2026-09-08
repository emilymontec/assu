/**
 * BankService, BankAccountService y SyncLogService se usan solo como
 * TIPOS en el constructor, pero NestJS necesita esa metadata en runtime
 * — sin estos mocks, Jest arrastraría la cadena real hasta @prisma/client.
 */
jest.mock('../bank/bank.service', () => ({ BankService: class {} }));
jest.mock('../bank-account/bank-account.service', () => ({ BankAccountService: class {} }));
jest.mock('../sync-log/sync-log.service', () => ({ SyncLogService: class {} }));

// eslint-disable-next-line import/first
import { StatusService } from './status.service';
import { Bank } from '../../core/domain/bank/bank.entity';
import { BankStatus, CollectorType } from '../../core/domain/bank/bank-status.enum';
import { BankAccount } from '../../core/domain/bank-account/bank-account.entity';
import { AccountStatus } from '../../core/domain/bank-account/account-status.enum';
import { SyncLog, SyncStatus } from '../../core/domain/sync/sync-log.entity';

function makeBank(status: BankStatus): Bank {
  return new Bank('bank-1', 'Nequi', 'CO', status, CollectorType.WEB_SCRAPING, 'nequi', new Date(), new Date());
}

function makeAccount(
  overrides: Partial<{ status: AccountStatus; lastSyncAt: Date | null }> = {},
): BankAccount {
  return new BankAccount(
    'acc-1',
    'bank-1',
    'merchant-1',
    '3001234567',
    'fp:ct',
    true, // credentialsReadOnlyConfirmed
    overrides.status ?? AccountStatus.ACTIVE,
    true,
    60,
    overrides.lastSyncAt ?? null,
    'ref-1',
    new Date(),
    new Date(),
  );
}

describe('StatusService', () => {
  const bankService = { findAll: jest.fn() };
  const bankAccountService = { findAll: jest.fn(), findById: jest.fn() };
  const syncLogService = { findMany: jest.fn() };

  function buildService(): StatusService {
    return new StatusService(bankService as any, bankAccountService as any, syncLogService as any);
  }

  beforeEach(() => jest.clearAllMocks());

  describe('getSystemStatus()', () => {
    it('agrega bancos y cuentas por estado, y reporta "ok" si nada está degradado', async () => {
      bankService.findAll.mockResolvedValue([makeBank(BankStatus.ACTIVE), makeBank(BankStatus.ACTIVE)]);
      bankAccountService.findAll.mockResolvedValue([
        { account: makeAccount({ status: AccountStatus.ACTIVE }), bankName: 'Nequi' },
        { account: makeAccount({ status: AccountStatus.PENDING }), bankName: 'Nequi' },
      ]);
      const service = buildService();

      const result = await service.getSystemStatus();

      expect(result.status).toBe('ok');
      expect(result.banks).toEqual({ total: 2, ACTIVE: 2, INACTIVE: 0, DEGRADED: 0 });
      expect(result.accounts).toEqual({
        total: 2,
        PENDING: 1,
        ACTIVE: 1,
        REAUTH_REQUIRED: 0,
        SUSPENDED: 0,
        ERROR: 0,
      });
      expect(result.accountsNeedingReconnection).toBe(0);
    });

    it('reporta "degraded" si hay cuentas en REAUTH_REQUIRED o ERROR', async () => {
      bankService.findAll.mockResolvedValue([makeBank(BankStatus.ACTIVE)]);
      bankAccountService.findAll.mockResolvedValue([
        { account: makeAccount({ status: AccountStatus.REAUTH_REQUIRED }), bankName: 'Nequi' },
      ]);
      const service = buildService();

      const result = await service.getSystemStatus();

      expect(result.status).toBe('degraded');
      expect(result.accountsNeedingReconnection).toBe(1);
    });

    it('reporta "degraded" si hay algún banco DEGRADED', async () => {
      bankService.findAll.mockResolvedValue([makeBank(BankStatus.DEGRADED)]);
      bankAccountService.findAll.mockResolvedValue([]);
      const service = buildService();

      const result = await service.getSystemStatus();

      expect(result.status).toBe('degraded');
    });
  });

  describe('getLastSyncForAccount()', () => {
    it('combina el estado de la cuenta con el último SyncLog registrado', async () => {
      bankAccountService.findById.mockResolvedValue({
        account: makeAccount({ lastSyncAt: new Date('2026-01-15T10:00:00Z') }),
        bankName: 'Nequi',
      });
      syncLogService.findMany.mockResolvedValue([
        new SyncLog('log-1', 'acc-1', new Date(), new Date(), SyncStatus.SUCCESS, null, 3, 1),
      ]);
      const service = buildService();

      const result = await service.getLastSyncForAccount('acc-1');

      expect(syncLogService.findMany).toHaveBeenCalledWith({ accountId: 'acc-1', limit: 1 });
      expect(result.lastSyncStatus).toBe(SyncStatus.SUCCESS);
      expect(result.bankName).toBe('Nequi');
    });

    it('devuelve lastSyncStatus null si la cuenta nunca se ha sincronizado', async () => {
      bankAccountService.findById.mockResolvedValue({ account: makeAccount(), bankName: 'Nequi' });
      syncLogService.findMany.mockResolvedValue([]);
      const service = buildService();

      const result = await service.getLastSyncForAccount('acc-1');

      expect(result.lastSyncStatus).toBeNull();
      expect(result.lastSyncError).toBeNull();
    });
  });

  describe('getLastSyncOverview()', () => {
    it('ordena las cuentas con la sincronización más antigua/nula primero', async () => {
      bankAccountService.findAll.mockResolvedValue([
        { account: makeAccount({ lastSyncAt: new Date('2026-01-15') }), bankName: 'Nequi' },
        { account: { ...makeAccount({ lastSyncAt: null }), id: 'acc-2' }, bankName: 'Nequi' },
      ]);
      syncLogService.findMany.mockResolvedValue([]);
      const service = buildService();

      const result = await service.getLastSyncOverview();

      expect(result[0].lastSyncAt).toBeNull();
      expect(result[1].lastSyncAt).toEqual(new Date('2026-01-15'));
    });
  });
});
