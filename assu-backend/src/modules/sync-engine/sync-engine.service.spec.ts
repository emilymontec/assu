/**
 * BankAccountService, BankService y SyncLogService se usan solo como
 * TIPOS en los constructores de SyncEngineService (y, transitivamente,
 * de LoginManagerService), pero NestJS necesita esa metadata en runtime
 * — sin estos mocks, Jest arrastraría la cadena real hasta @prisma/client.
 * El resto de colaboradores (LoginManagerService real, MovementParserService,
 * MovementValidatorService, MovementDeduplicationService, MovementService)
 * no tocan Prisma en su cadena de imports y no necesitan mock.
 */
jest.mock('../bank-account/bank-account.service', () => ({ BankAccountService: class {} }));
jest.mock('../bank/bank.service', () => ({ BankService: class {} }));
jest.mock('../sync-log/sync-log.service', () => ({ SyncLogService: class {} }));

// eslint-disable-next-line import/first
import { SyncEngineService } from './sync-engine.service';
import { Bank } from '../../core/domain/bank/bank.entity';
import { BankStatus, CollectorType } from '../../core/domain/bank/bank-status.enum';
import { BankAccount } from '../../core/domain/bank-account/bank-account.entity';
import { AccountStatus } from '../../core/domain/bank-account/account-status.enum';
import { SyncStatus, SyncLog } from '../../core/domain/sync/sync-log.entity';
import { CollectorAdapter } from '../../core/ports/collector-adapter.interface';
import { MOVEMENT_CREATED_EVENT } from '../events/movement-created.event';
import { AuditResult } from '../../core/domain/audit/audit-result.enum';

function makeBank(): Bank {
  return new Bank('bank-1', 'Nequi', 'CO', BankStatus.ACTIVE, CollectorType.WEB_SCRAPING, 'nequi', new Date(), new Date());
}

function makeAccount(lastMovementReference: string | null = null): BankAccount {
  return new BankAccount(
    'acc-1',
    'bank-1',
    'merchant-1',
    '3001234567',
    'fp:ct',
    true, // credentialsReadOnlyConfirmed
    AccountStatus.ACTIVE,
    true,
    60,
    null,
    lastMovementReference,
    new Date(),
    new Date(),
  );
}

function makeFakeAdapter(overrides: Partial<CollectorAdapter> = {}): CollectorAdapter {
  return {
    login: jest.fn().mockResolvedValue(undefined),
    sync: jest.fn().mockResolvedValue([]),
    logout: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeSyncLog(): SyncLog {
  return new SyncLog('log-1', 'acc-1', new Date(), null, SyncStatus.RUNNING, null, 0, 0);
}

describe('SyncEngineService', () => {
  const bankAccountService = {
    findById: jest.fn(),
    recordSuccessfulSync: jest.fn(),
  };
  const bankService = { findById: jest.fn() };
  const loginManagerService = { ensureLoggedIn: jest.fn(), logout: jest.fn() };
  const movementParserService = { parse: jest.fn() };
  const movementValidatorService = { validate: jest.fn() };
  const movementDeduplicationService = { isDuplicate: jest.fn() };
  const movementService = { create: jest.fn() };
  const syncLogService = { start: jest.fn(), finish: jest.fn() };
  const retryErrorHandlingService = { handleSyncFailure: jest.fn() };
  const rateLimitingService = { checkAccountLimit: jest.fn(), checkBankLimit: jest.fn() };
  const auditService = { logSync: jest.fn() };
  const metricsService = {
    recordSync: jest.fn(),
    recordMovementsSaved: jest.fn(),
    recordSyncError: jest.fn(),
  };
  const eventPublisher = { publish: jest.fn() };

  function buildService(): SyncEngineService {
    return new SyncEngineService(
      bankAccountService as any,
      bankService as any,
      loginManagerService as any,
      movementParserService as any,
      movementValidatorService as any,
      movementDeduplicationService as any,
      movementService as any,
      syncLogService as any,
      retryErrorHandlingService as any,
      rateLimitingService as any,
      auditService as any,
      metricsService as any,
      eventPublisher as any,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    syncLogService.start.mockResolvedValue(makeSyncLog());
    // Por defecto, finish() devuelve el log ya cerrado (con finishedAt),
    // para que `durationMs` no explote al calcular las métricas.
    syncLogService.finish.mockImplementation((_id: string, data: Partial<SyncLog>) =>
      Promise.resolve(
        new SyncLog(
          'log-1',
          'acc-1',
          new Date(Date.now() - 1000),
          new Date(),
          data.status ?? SyncStatus.SUCCESS,
          data.error ?? null,
          data.movementsFound ?? 0,
          data.movementsNew ?? 0,
        ),
      ),
    );
    bankAccountService.findById.mockResolvedValue({ account: makeAccount(), bankName: 'Nequi' });
    bankService.findById.mockResolvedValue(makeBank());
    loginManagerService.logout.mockResolvedValue(undefined);
    retryErrorHandlingService.handleSyncFailure.mockResolvedValue(undefined);
    rateLimitingService.checkAccountLimit.mockResolvedValue(undefined);
    rateLimitingService.checkBankLimit.mockResolvedValue(undefined);
  });

  it('flujo completo: parsea, valida, descarta duplicados, guarda, publica evento y actualiza el puntero', async () => {
    const adapter = makeFakeAdapter({
      sync: jest.fn().mockResolvedValue([{ referencia: 'ref-nuevo' }, { referencia: 'ref-duplicado' }]),
    });
    loginManagerService.ensureLoggedIn.mockResolvedValue(adapter);
    movementParserService.parse.mockImplementation((_key: string, raw: any) => ({
      reference: raw.referencia,
      amount: 10000,
      currency: 'COP',
      sender: null,
      receiver: null,
      movementType: 'UNKNOWN',
      date: new Date('2026-01-15'),
    }));
    movementValidatorService.validate.mockReturnValue({ valid: true });
    movementDeduplicationService.isDuplicate.mockImplementation((_acc: string, ref: string) =>
      Promise.resolve(ref === 'ref-duplicado'),
    );
    movementService.create.mockImplementation((m: any) => Promise.resolve(m));

    const service = buildService();
    const result = await service.syncAccount('acc-1');

    expect(result).toEqual({ movementsFound: 2, movementsNew: 1 });
    expect(movementService.create).toHaveBeenCalledTimes(1);
    expect(eventPublisher.publish).toHaveBeenCalledTimes(1);
    expect(eventPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({ name: MOVEMENT_CREATED_EVENT, payload: expect.objectContaining({ reference: 'ref-nuevo' }) }),
    );
    expect(bankAccountService.recordSuccessfulSync).toHaveBeenCalledWith('acc-1', 'ref-nuevo');
    expect(loginManagerService.logout).toHaveBeenCalledWith('acc-1', adapter);
    expect(syncLogService.finish).toHaveBeenCalledWith('log-1', {
      status: SyncStatus.SUCCESS,
      movementsFound: 2,
      movementsNew: 1,
    });
    expect(auditService.logSync).toHaveBeenCalledWith('acc-1', AuditResult.SUCCESS, {
      movementsFound: 2,
      movementsNew: 1,
    });
    expect(metricsService.recordSync).toHaveBeenCalledWith('nequi', 'SUCCESS', expect.any(Number));
    expect(metricsService.recordMovementsSaved).toHaveBeenCalledWith('nequi', 1);
  });

  it('descarta movimientos inválidos sin persistirlos ni publicarlos', async () => {
    const adapter = makeFakeAdapter({ sync: jest.fn().mockResolvedValue([{ referencia: 'ref-1' }]) });
    loginManagerService.ensureLoggedIn.mockResolvedValue(adapter);
    movementParserService.parse.mockReturnValue({
      reference: 'ref-1',
      amount: NaN,
      currency: 'COP',
      sender: null,
      receiver: null,
      movementType: 'UNKNOWN',
      date: new Date(),
    });
    movementValidatorService.validate.mockReturnValue({ valid: false, reason: 'monto inválido' });

    const service = buildService();
    const result = await service.syncAccount('acc-1');

    expect(result.movementsNew).toBe(0);
    expect(movementService.create).not.toHaveBeenCalled();
    expect(eventPublisher.publish).not.toHaveBeenCalled();
  });

  it('actualiza el puntero aunque el único movimiento encontrado sea duplicado', async () => {
    const adapter = makeFakeAdapter({ sync: jest.fn().mockResolvedValue([{ referencia: 'ref-ya-conocido' }]) });
    loginManagerService.ensureLoggedIn.mockResolvedValue(adapter);
    movementParserService.parse.mockReturnValue({
      reference: 'ref-ya-conocido',
      amount: 5000,
      currency: 'COP',
      sender: null,
      receiver: null,
      movementType: 'UNKNOWN',
      date: new Date(),
    });
    movementValidatorService.validate.mockReturnValue({ valid: true });
    movementDeduplicationService.isDuplicate.mockResolvedValue(true);

    const service = buildService();
    await service.syncAccount('acc-1');

    expect(movementService.create).not.toHaveBeenCalled();
    expect(bankAccountService.recordSuccessfulSync).toHaveBeenCalledWith('acc-1', 'ref-ya-conocido');
  });

  it('pasa null al puntero si no se encontró ningún movimiento (sync exitoso, nada nuevo)', async () => {
    const adapter = makeFakeAdapter({ sync: jest.fn().mockResolvedValue([]) });
    loginManagerService.ensureLoggedIn.mockResolvedValue(adapter);

    const service = buildService();
    const result = await service.syncAccount('acc-1');

    expect(result).toEqual({ movementsFound: 0, movementsNew: 0 });
    expect(bankAccountService.recordSuccessfulSync).toHaveBeenCalledWith('acc-1', null);
  });

  it('un fallo al publicar el evento NO revierte el movimiento ya guardado', async () => {
    const adapter = makeFakeAdapter({ sync: jest.fn().mockResolvedValue([{ referencia: 'ref-1' }]) });
    loginManagerService.ensureLoggedIn.mockResolvedValue(adapter);
    movementParserService.parse.mockReturnValue({
      reference: 'ref-1',
      amount: 10000,
      currency: 'COP',
      sender: null,
      receiver: null,
      movementType: 'UNKNOWN',
      date: new Date(),
    });
    movementValidatorService.validate.mockReturnValue({ valid: true });
    movementDeduplicationService.isDuplicate.mockResolvedValue(false);
    movementService.create.mockImplementation((m: any) => Promise.resolve(m));
    eventPublisher.publish.mockRejectedValue(new Error('Redis caído'));

    const service = buildService();
    const result = await service.syncAccount('acc-1');

    expect(result.movementsNew).toBe(1); // el movimiento SÍ se contó/guardó
    expect(syncLogService.finish).toHaveBeenCalledWith(
      'log-1',
      expect.objectContaining({ status: SyncStatus.SUCCESS }),
    );
  });

  it('si el login falla, se registra el sync como FAILED, se evalúa la escalación y el error se propaga', async () => {
    loginManagerService.ensureLoggedIn.mockRejectedValue(new Error('Credenciales inválidas'));

    const service = buildService();

    await expect(service.syncAccount('acc-1')).rejects.toThrow('Credenciales inválidas');
    expect(syncLogService.finish).toHaveBeenCalledWith(
      'log-1',
      expect.objectContaining({ status: SyncStatus.FAILED, error: 'Credenciales inválidas' }),
    );
    expect(loginManagerService.logout).not.toHaveBeenCalled(); // nunca hubo adapter logueado que cerrar
    expect(retryErrorHandlingService.handleSyncFailure).toHaveBeenCalledWith('acc-1');
    expect(auditService.logSync).toHaveBeenCalledWith('acc-1', AuditResult.FAILURE, undefined, 'Credenciales inválidas');
    expect(metricsService.recordSync).toHaveBeenCalledWith('nequi', 'FAILED', expect.any(Number));
    expect(metricsService.recordSyncError).toHaveBeenCalledWith('nequi', 'Error');
  });

  it('un fallo al evaluar la escalación de errores NO oculta el error original del sync', async () => {
    loginManagerService.ensureLoggedIn.mockRejectedValue(new Error('Credenciales inválidas'));
    retryErrorHandlingService.handleSyncFailure.mockRejectedValue(new Error('Redis caído al consultar historial'));

    const service = buildService();

    await expect(service.syncAccount('acc-1')).rejects.toThrow('Credenciales inválidas');
  });

  it('si adapter.sync() falla DESPUÉS del login, igual se hace logout antes de propagar el error', async () => {
    const adapter = makeFakeAdapter({ sync: jest.fn().mockRejectedValue(new Error('Timeout')) });
    loginManagerService.ensureLoggedIn.mockResolvedValue(adapter);

    const service = buildService();

    await expect(service.syncAccount('acc-1')).rejects.toThrow('Timeout');
    expect(loginManagerService.logout).toHaveBeenCalledWith('acc-1', adapter);
    expect(syncLogService.finish).toHaveBeenCalledWith(
      'log-1',
      expect.objectContaining({ status: SyncStatus.FAILED }),
    );
  });

  it('en un sync exitoso, NO se evalúa la escalación de errores', async () => {
    const adapter = makeFakeAdapter();
    loginManagerService.ensureLoggedIn.mockResolvedValue(adapter);

    const service = buildService();
    await service.syncAccount('acc-1');

    expect(retryErrorHandlingService.handleSyncFailure).not.toHaveBeenCalled();
  });

  it('usa account.lastMovementReference como sincePointer al llamar adapter.sync()', async () => {
    bankAccountService.findById.mockResolvedValue({ account: makeAccount('ref-anterior'), bankName: 'Nequi' });
    const adapter = makeFakeAdapter();
    loginManagerService.ensureLoggedIn.mockResolvedValue(adapter);

    const service = buildService();
    await service.syncAccount('acc-1');

    expect(adapter.sync).toHaveBeenCalledWith('ref-anterior');
  });

  it('revisa el límite de cuenta y de banco ANTES de intentar login', async () => {
    const adapter = makeFakeAdapter();
    loginManagerService.ensureLoggedIn.mockResolvedValue(adapter);

    const service = buildService();
    await service.syncAccount('acc-1');

    expect(rateLimitingService.checkAccountLimit).toHaveBeenCalledWith('acc-1');
    expect(rateLimitingService.checkBankLimit).toHaveBeenCalledWith('nequi');
    expect(loginManagerService.ensureLoggedIn).toHaveBeenCalled();
  });

  it('si se excede el límite de la cuenta, NO se intenta login y el sync se marca FAILED', async () => {
    rateLimitingService.checkAccountLimit.mockRejectedValue(new Error('Se alcanzó el límite'));

    const service = buildService();

    await expect(service.syncAccount('acc-1')).rejects.toThrow('Se alcanzó el límite');
    expect(loginManagerService.ensureLoggedIn).not.toHaveBeenCalled();
    expect(syncLogService.finish).toHaveBeenCalledWith(
      'log-1',
      expect.objectContaining({ status: SyncStatus.FAILED }),
    );
  });

  it('si se excede el límite del banco, NO se intenta login', async () => {
    rateLimitingService.checkBankLimit.mockRejectedValue(new Error('Se alcanzó el límite del banco'));

    const service = buildService();

    await expect(service.syncAccount('acc-1')).rejects.toThrow('Se alcanzó el límite del banco');
    expect(loginManagerService.ensureLoggedIn).not.toHaveBeenCalled();
  });
});
