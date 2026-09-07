/**
 * BankAccountService y SyncLogService se usan solo como TIPOS en el
 * constructor, pero NestJS necesita esa metadata en runtime — sin estos
 * mocks, Jest arrastraría la cadena real hasta @prisma/client.
 */
jest.mock('../bank-account/bank-account.service', () => ({ BankAccountService: class {} }));
jest.mock('../sync-log/sync-log.service', () => ({ SyncLogService: class {} }));

// eslint-disable-next-line import/first
import { RetryErrorHandlingService } from './retry-error-handling.service';
import { InvalidCredentialsError, PortalStructureChangedError } from '../../common/errors/permanent.error';
import { BankUnavailableError, TimeoutError } from '../../common/errors/transient.error';
import { AccountStatus } from '../../core/domain/bank-account/account-status.enum';
import { BankAccount } from '../../core/domain/bank-account/bank-account.entity';
import { AlertType } from '../../core/domain/monitoring/alert-type.enum';
import { AlertSeverity } from '../../core/domain/monitoring/alert-severity.enum';

function makeAccount(status: AccountStatus): BankAccount {
  return new BankAccount(
    'acc-1',
    'bank-1',
    'merchant-1',
    '3001234567',
    'fp:ct',
    status,
    true,
    60,
    null,
    null,
    new Date(),
    new Date(),
  );
}

describe('RetryErrorHandlingService', () => {
  const bankAccountService = { findById: jest.fn(), markError: jest.fn() };
  const syncLogService = { countConsecutiveFailures: jest.fn() };
  const auditService = { logAdminOperation: jest.fn() };
  const alertService = { raise: jest.fn() };

  function buildService(): RetryErrorHandlingService {
    return new RetryErrorHandlingService(
      bankAccountService as any,
      syncLogService as any,
      auditService as any,
      alertService as any,
    );
  }

  beforeEach(() => jest.clearAllMocks());

  describe('classify()', () => {
    it('marca los PermanentError como no reintentables', () => {
      const service = buildService();
      const result = service.classify(new InvalidCredentialsError('PIN incorrecto'));

      expect(result).toEqual({ retryable: false, reason: 'PIN incorrecto' });
    });

    it('marca los TransientError como reintentables', () => {
      const service = buildService();
      const result = service.classify(new TimeoutError('timeout de red'));

      expect(result).toEqual({ retryable: true, reason: 'timeout de red' });
    });

    it('marca los errores no clasificados como reintentables por precaución', () => {
      const service = buildService();
      const result = service.classify(new Error('algo inesperado'));

      expect(result.retryable).toBe(true);
      expect(result.reason).toMatch(/no clasificado/i);
    });

    it('también clasifica correctamente otros subtipos (BankUnavailableError, PortalStructureChangedError)', () => {
      const service = buildService();

      expect(service.classify(new BankUnavailableError()).retryable).toBe(true);
      expect(service.classify(new PortalStructureChangedError()).retryable).toBe(false);
    });
  });

  describe('handleSyncFailure()', () => {
    it('escala a ERROR si hay 5 o más fallos consecutivos', async () => {
      bankAccountService.findById.mockResolvedValue({ account: makeAccount(AccountStatus.ACTIVE), bankName: 'Nequi' });
      syncLogService.countConsecutiveFailures.mockResolvedValue(5);
      const service = buildService();

      await service.handleSyncFailure('acc-1');

      expect(bankAccountService.markError).toHaveBeenCalledWith('acc-1');
      expect(auditService.logAdminOperation).toHaveBeenCalledWith(
        'ESCALATE_TO_ERROR',
        'BankAccount',
        'acc-1',
        'retry-error-handling',
        { consecutiveFailures: 5 },
      );
      expect(alertService.raise).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AlertType.ACCOUNT_ESCALATED,
          severity: AlertSeverity.CRITICAL,
          entityType: 'BankAccount',
          entityId: 'acc-1',
        }),
      );
    });

    it('NO escala si hay menos de 5 fallos consecutivos', async () => {
      bankAccountService.findById.mockResolvedValue({ account: makeAccount(AccountStatus.ACTIVE), bankName: 'Nequi' });
      syncLogService.countConsecutiveFailures.mockResolvedValue(3);
      const service = buildService();

      await service.handleSyncFailure('acc-1');

      expect(bankAccountService.markError).not.toHaveBeenCalled();
      expect(auditService.logAdminOperation).not.toHaveBeenCalled();
      expect(alertService.raise).not.toHaveBeenCalled();
    });

    it('NO pisa el estado si la cuenta ya está en REAUTH_REQUIRED (más específico)', async () => {
      bankAccountService.findById.mockResolvedValue({
        account: makeAccount(AccountStatus.REAUTH_REQUIRED),
        bankName: 'Nequi',
      });
      const service = buildService();

      await service.handleSyncFailure('acc-1');

      expect(syncLogService.countConsecutiveFailures).not.toHaveBeenCalled();
      expect(bankAccountService.markError).not.toHaveBeenCalled();
    });

    it('NO pisa el estado si la cuenta ya está SUSPENDED', async () => {
      bankAccountService.findById.mockResolvedValue({
        account: makeAccount(AccountStatus.SUSPENDED),
        bankName: 'Nequi',
      });
      const service = buildService();

      await service.handleSyncFailure('acc-1');

      expect(bankAccountService.markError).not.toHaveBeenCalled();
    });
  });
});
