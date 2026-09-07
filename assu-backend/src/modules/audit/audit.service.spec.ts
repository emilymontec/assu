/**
 * AuditLogRepository se usa solo como TIPO en el constructor, pero
 * NestJS necesita esa metadata en runtime — sin este mock, Jest
 * arrastraría la cadena real hasta @prisma/client.
 */
jest.mock('./repositories/audit-log.repository', () => ({ AuditLogRepository: class {} }));

// eslint-disable-next-line import/first
import { AuditService } from './audit.service';
import { AuditAction } from '../../core/domain/audit/audit-action.enum';
import { AuditResult } from '../../core/domain/audit/audit-result.enum';

describe('AuditService', () => {
  const repository = {
    create: jest.fn(),
    findMany: jest.fn(),
  };

  function buildService() {
    return new AuditService(repository as any);
  }

  beforeEach(() => jest.clearAllMocks());

  describe('record()', () => {
    it('delega en el repositorio', async () => {
      const service = buildService();
      const entry = {
        action: AuditAction.LOGIN,
        actor: 'login-manager',
        entityType: 'BankAccount',
        entityId: 'acc-1',
        result: AuditResult.SUCCESS,
      };

      await service.record(entry);

      expect(repository.create).toHaveBeenCalledWith(entry);
    });

    it('NUNCA propaga un error del repositorio (auditar no debe romper el flujo principal)', async () => {
      repository.create.mockRejectedValue(new Error('Postgres caído'));
      const service = buildService();

      await expect(
        service.record({
          action: AuditAction.LOGIN,
          actor: 'login-manager',
          entityType: 'BankAccount',
          entityId: 'acc-1',
          result: AuditResult.SUCCESS,
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('logLogin()', () => {
    it('registra un login exitoso con el actor correcto', async () => {
      const service = buildService();
      await service.logLogin('acc-1', AuditResult.SUCCESS);

      expect(repository.create).toHaveBeenCalledWith({
        action: AuditAction.LOGIN,
        actor: 'login-manager',
        entityType: 'BankAccount',
        entityId: 'acc-1',
        result: AuditResult.SUCCESS,
        errorMessage: null,
      });
    });

    it('registra un login fallido con el mensaje de error', async () => {
      const service = buildService();
      await service.logLogin('acc-1', AuditResult.FAILURE, 'Credenciales inválidas');

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ result: AuditResult.FAILURE, errorMessage: 'Credenciales inválidas' }),
      );
    });
  });

  describe('logLogout()', () => {
    it('registra un logout', async () => {
      const service = buildService();
      await service.logLogout('acc-1', AuditResult.SUCCESS);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.LOGOUT, entityId: 'acc-1' }),
      );
    });
  });

  describe('logSync()', () => {
    it('registra un sync exitoso con metadata', async () => {
      const service = buildService();
      await service.logSync('acc-1', AuditResult.SUCCESS, { movementsFound: 3, movementsNew: 1 });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.SYNC,
          metadata: { movementsFound: 3, movementsNew: 1 },
        }),
      );
    });

    it('registra un sync fallido con el error', async () => {
      const service = buildService();
      await service.logSync('acc-1', AuditResult.FAILURE, undefined, 'Timeout');

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ result: AuditResult.FAILURE, errorMessage: 'Timeout' }),
      );
    });
  });

  describe('logConfigChange()', () => {
    it('registra un cambio de configuración con los cambios en metadata', async () => {
      const service = buildService();
      await service.logConfigChange('Bank', 'bank-1', 'api', { status: 'INACTIVE' });

      expect(repository.create).toHaveBeenCalledWith({
        action: AuditAction.CONFIG_CHANGE,
        actor: 'api',
        entityType: 'Bank',
        entityId: 'bank-1',
        result: AuditResult.SUCCESS,
        metadata: { status: 'INACTIVE' },
      });
    });
  });

  describe('logAdminOperation()', () => {
    it('incluye el nombre de la operación dentro de metadata', async () => {
      const service = buildService();
      await service.logAdminOperation('SUSPEND', 'BankAccount', 'acc-1', 'api');

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.ADMIN_OPERATION,
          metadata: { operation: 'SUSPEND' },
        }),
      );
    });
  });

  describe('logError()', () => {
    it('registra un error genérico como FAILURE', async () => {
      const service = buildService();
      await service.logError('BankAccount', 'acc-1', 'retry-error-handling', 'Banco caído');

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.ERROR, result: AuditResult.FAILURE }),
      );
    });
  });

  describe('findMany()', () => {
    it('delega los filtros en el repositorio', async () => {
      const service = buildService();
      await service.findMany({ entityId: 'acc-1', limit: 10 });

      expect(repository.findMany).toHaveBeenCalledWith({ entityId: 'acc-1', limit: 10 });
    });
  });
});
