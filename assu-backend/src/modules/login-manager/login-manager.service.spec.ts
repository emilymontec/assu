/**
 * Igual que en bank-account.service.spec.ts: BankAccountService y
 * BankService se importan solo como TIPOS en el constructor, pero
 * NestJS necesita esa metadata en runtime (emitDecoratorMetadata), así
 * que TypeScript no puede elidir esos imports. Sin este mock, Jest
 * arrastraría la cadena real hasta @prisma/client. AdapterFactoryService
 * y SessionManagerService NO necesitan mock: ninguno de los dos toca
 * Prisma en su cadena de imports.
 */
jest.mock('../bank-account/bank-account.service', () => ({ BankAccountService: class {} }));
jest.mock('../bank/bank.service', () => ({ BankService: class {} }));

// eslint-disable-next-line import/first
import { LoginManagerService } from './login-manager.service';
import { AccountStatus } from '../../core/domain/bank-account/account-status.enum';
import { BankStatus, CollectorType } from '../../core/domain/bank/bank-status.enum';
import { Bank } from '../../core/domain/bank/bank.entity';
import { BankAccount } from '../../core/domain/bank-account/bank-account.entity';
import { InvalidCredentialsError } from '../../common/errors/permanent.error';
import { TransientLoginError } from '../../common/errors/transient.error';
import { CollectorAdapter, ExportedSession } from '../../core/ports/collector-adapter.interface';
import { AuditResult } from '../../core/domain/audit/audit-result.enum';

function makeBank(status: BankStatus = BankStatus.ACTIVE): Bank {
  return new Bank('bank-1', 'Nequi', 'CO', status, CollectorType.WEB_SCRAPING, 'nequi', new Date(), new Date());
}

function makeAccount(overrides: Partial<{ status: AccountStatus }> = {}): BankAccount {
  return new BankAccount(
    'acc-1',
    'bank-1',
    'merchant-1',
    '3001234567',
    'fp:ciphertext',
    overrides.status ?? AccountStatus.ACTIVE,
    true,
    60,
    null,
    null,
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

describe('LoginManagerService', () => {
  const bankAccountService = {
    findById: jest.fn(),
    getDecryptedCredentials: jest.fn(),
    markReauthRequired: jest.fn(),
  };
  const bankService = { findById: jest.fn() };
  const adapterFactory = { create: jest.fn() };
  const sessionManager = {
    getValidSession: jest.fn(),
    hasValidSession: jest.fn(),
    createSession: jest.fn(),
    invalidate: jest.fn(),
  };
  const auditService = {
    logLogin: jest.fn(),
    logLogout: jest.fn(),
  };

  function buildService(): LoginManagerService {
    return new LoginManagerService(
      bankAccountService as any,
      bankService as any,
      adapterFactory as any,
      sessionManager as any,
      auditService as any,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reutiliza una sesión guardada sin llamar a login() (evita logins innecesarios)', async () => {
    bankAccountService.findById.mockResolvedValue({ account: makeAccount(), bankName: 'Nequi' });
    bankService.findById.mockResolvedValue(makeBank());
    const restoreSession = jest.fn().mockResolvedValue(undefined);
    const adapter = makeFakeAdapter({ restoreSession });
    adapterFactory.create.mockReturnValue(adapter);
    const storedSession: ExportedSession & { accountId: string; createdAt: Date; expiresAt: Date } = {
      accountId: 'acc-1',
      cookies: [{ name: 'sid' }],
      tokens: {},
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    };
    sessionManager.getValidSession.mockResolvedValue(storedSession);

    const service = buildService();
    const result = await service.ensureLoggedIn('acc-1');

    expect(restoreSession).toHaveBeenCalledWith(storedSession);
    expect(adapter.login).not.toHaveBeenCalled();
    expect(result).toBe(adapter);
  });

  it('hace login completo cuando no hay sesión guardada', async () => {
    bankAccountService.findById.mockResolvedValue({ account: makeAccount(), bankName: 'Nequi' });
    bankService.findById.mockResolvedValue(makeBank());
    sessionManager.getValidSession.mockResolvedValue(null);
    bankAccountService.getDecryptedCredentials.mockResolvedValue({ phone: '3000000000', pin: '1234' });
    const exportSession = jest.fn().mockResolvedValue({ cookies: [{ n: 1 }], tokens: { access: 'tok' } });
    const adapter = makeFakeAdapter({ exportSession });
    adapterFactory.create.mockReturnValue(adapter);

    const service = buildService();
    const result = await service.ensureLoggedIn('acc-1');

    expect(adapter.login).toHaveBeenCalledWith({ phone: '3000000000', pin: '1234' });
    expect(sessionManager.createSession).toHaveBeenCalledWith('acc-1', [{ n: 1 }], { access: 'tok' });
    expect(result).toBe(adapter);
    expect(auditService.logLogin).toHaveBeenCalledWith('acc-1', AuditResult.SUCCESS);
  });

  it('hace login completo si el adapter no soporta restoreSession, aunque haya sesión guardada', async () => {
    bankAccountService.findById.mockResolvedValue({ account: makeAccount(), bankName: 'Nequi' });
    bankService.findById.mockResolvedValue(makeBank());
    sessionManager.getValidSession.mockResolvedValue({
      accountId: 'acc-1',
      cookies: [],
      tokens: {},
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });
    bankAccountService.getDecryptedCredentials.mockResolvedValue({ phone: '300', pin: '1234' });
    const adapter = makeFakeAdapter(); // sin restoreSession/exportSession
    adapterFactory.create.mockReturnValue(adapter);

    const service = buildService();
    await service.ensureLoggedIn('acc-1');

    expect(adapter.login).toHaveBeenCalled();
    expect(sessionManager.createSession).toHaveBeenCalledWith('acc-1', [], {});
  });

  it('marca la cuenta como REAUTH_REQUIRED cuando el login falla por credenciales inválidas', async () => {
    bankAccountService.findById.mockResolvedValue({ account: makeAccount(), bankName: 'Nequi' });
    bankService.findById.mockResolvedValue(makeBank());
    sessionManager.getValidSession.mockResolvedValue(null);
    bankAccountService.getDecryptedCredentials.mockResolvedValue({ phone: '300', pin: 'malo' });
    const adapter = makeFakeAdapter({
      login: jest.fn().mockRejectedValue(new InvalidCredentialsError('PIN incorrecto')),
    });
    adapterFactory.create.mockReturnValue(adapter);

    const service = buildService();

    await expect(service.ensureLoggedIn('acc-1')).rejects.toThrow(InvalidCredentialsError);
    expect(bankAccountService.markReauthRequired).toHaveBeenCalledWith('acc-1');
    expect(sessionManager.createSession).not.toHaveBeenCalled();
    expect(auditService.logLogin).toHaveBeenCalledWith('acc-1', AuditResult.FAILURE, 'PIN incorrecto');
  });

  it('propaga errores transitorios SIN marcar la cuenta como REAUTH_REQUIRED', async () => {
    bankAccountService.findById.mockResolvedValue({ account: makeAccount(), bankName: 'Nequi' });
    bankService.findById.mockResolvedValue(makeBank());
    sessionManager.getValidSession.mockResolvedValue(null);
    bankAccountService.getDecryptedCredentials.mockResolvedValue({ phone: '300', pin: '1234' });
    const adapter = makeFakeAdapter({ login: jest.fn().mockRejectedValue(new TransientLoginError('timeout')) });
    adapterFactory.create.mockReturnValue(adapter);

    const service = buildService();

    await expect(service.ensureLoggedIn('acc-1')).rejects.toThrow(TransientLoginError);
    expect(bankAccountService.markReauthRequired).not.toHaveBeenCalled();
  });

  it('rechaza iniciar sesión si el banco no está activo, sin siquiera crear el adapter', async () => {
    bankAccountService.findById.mockResolvedValue({ account: makeAccount(), bankName: 'Nequi' });
    bankService.findById.mockResolvedValue(makeBank(BankStatus.INACTIVE));

    const service = buildService();

    await expect(service.ensureLoggedIn('acc-1')).rejects.toThrow(/no está activo/i);
    expect(adapterFactory.create).not.toHaveBeenCalled();
  });

  it('rechaza iniciar sesión si la cuenta ya requiere reautenticación', async () => {
    bankAccountService.findById.mockResolvedValue({
      account: makeAccount({ status: AccountStatus.REAUTH_REQUIRED }),
      bankName: 'Nequi',
    });
    bankService.findById.mockResolvedValue(makeBank());

    const service = buildService();

    await expect(service.ensureLoggedIn('acc-1')).rejects.toThrow(InvalidCredentialsError);
    expect(adapterFactory.create).not.toHaveBeenCalled();
  });

  it('rechaza iniciar sesión si la cuenta está suspendida', async () => {
    bankAccountService.findById.mockResolvedValue({
      account: makeAccount({ status: AccountStatus.SUSPENDED }),
      bankName: 'Nequi',
    });
    bankService.findById.mockResolvedValue(makeBank());

    const service = buildService();

    await expect(service.ensureLoggedIn('acc-1')).rejects.toThrow(/suspendida/i);
  });

  it('isSessionExpired refleja el inverso de hasValidSession', async () => {
    sessionManager.hasValidSession.mockResolvedValue(true);
    const service = buildService();

    expect(await service.isSessionExpired('acc-1')).toBe(false);

    sessionManager.hasValidSession.mockResolvedValue(false);
    expect(await service.isSessionExpired('acc-1')).toBe(true);
  });

  it('logout() cierra el adapter, invalida la sesión guardada y audita el éxito', async () => {
    const adapter = makeFakeAdapter();
    const service = buildService();

    await service.logout('acc-1', adapter);

    expect(adapter.logout).toHaveBeenCalledTimes(1);
    expect(sessionManager.invalidate).toHaveBeenCalledWith('acc-1');
    expect(auditService.logLogout).toHaveBeenCalledWith('acc-1', AuditResult.SUCCESS);
  });

  it('logout() audita el fallo y propaga el error si adapter.logout() falla', async () => {
    const adapter = makeFakeAdapter({ logout: jest.fn().mockRejectedValue(new Error('conexión cerrada')) });
    const service = buildService();

    await expect(service.logout('acc-1', adapter)).rejects.toThrow('conexión cerrada');
    expect(auditService.logLogout).toHaveBeenCalledWith('acc-1', AuditResult.FAILURE, 'conexión cerrada');
    expect(sessionManager.invalidate).not.toHaveBeenCalled();
  });
});
