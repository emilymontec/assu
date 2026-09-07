import { BadRequestException, ConflictException, NotImplementedException } from '@nestjs/common';
import { AccountStatus } from '../../core/domain/bank-account/account-status.enum';
import { BankStatus, CollectorType } from '../../core/domain/bank/bank-status.enum';
import { Bank } from '../../core/domain/bank/bank.entity';
import { BankAccount } from '../../core/domain/bank-account/bank-account.entity';

/**
 * `BankAccountService` importa `BankAccountRepository` y `BankService`
 * solo como TIPOS (parámetros del constructor), pero NestJS necesita esa
 * metadata en runtime para su DI (emitDecoratorMetadata), así que
 * TypeScript no puede elidir esos imports. Sin este mock, Jest arrastraría
 * la cadena real hasta @prisma/client y fallaría por el mismo límite de
 * red del sandbox (no hay engine binario de Prisma aquí). Estos mocks NO
 * afectan la lógica bajo prueba: el test igual construye el servicio a
 * mano con los mocks de abajo, nunca usa las clases reales.
 */
jest.mock('./repositories/bank-account.repository', () => ({ BankAccountRepository: class {} }));
jest.mock('../bank/bank.service', () => ({ BankService: class {} }));

// eslint-disable-next-line import/first
import { BankAccountService } from './bank-account.service';

function makeBank(status: BankStatus = BankStatus.ACTIVE): Bank {
  return new Bank('bank-1', 'Nequi', 'CO', status, CollectorType.WEB_SCRAPING, 'nequi', new Date(), new Date());
}

function makeAccount(
  overrides: Partial<{ status: AccountStatus; syncEnabled: boolean; syncIntervalSeconds: number }> = {},
): BankAccount {
  return new BankAccount(
    'acc-1',
    'bank-1',
    'merchant-1',
    '3001234567',
    'fp:ciphertext-no-deberia-salir-nunca',
    overrides.status ?? AccountStatus.ACTIVE,
    overrides.syncEnabled ?? true,
    overrides.syncIntervalSeconds ?? 60,
    null,
    null,
    new Date(),
    new Date(),
  );
}

describe('BankAccountService', () => {
  const repository = {
    create: jest.fn(),
    findAllWithBank: jest.fn(),
    findByIdWithBank: jest.fn(),
    findById: jest.fn(),
    updateAccountNumber: jest.fn(),
    updateCredentials: jest.fn(),
    updateStatus: jest.fn(),
    updateSyncEnabled: jest.fn(),
    updateSyncInterval: jest.fn(),
  };
  const bankService = { findById: jest.fn() };
  const configService = { get: jest.fn().mockReturnValue(60) };
  const encryption = { encrypt: jest.fn(), decrypt: jest.fn() };
  const auditService = { logConfigChange: jest.fn(), logAdminOperation: jest.fn() };

  function buildService() {
    return new BankAccountService(
      repository as any,
      bankService as any,
      configService as any,
      encryption as any,
      auditService as any,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no permite crear una cuenta si el banco no está activo', async () => {
    bankService.findById.mockResolvedValue(makeBank(BankStatus.INACTIVE));
    const service = buildService();

    await expect(
      service.create({ bankId: 'bank-1', merchantId: 'm1', accountNumber: '123', credentials: { u: 'a' } }),
    ).rejects.toThrow(ConflictException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('cifra las credenciales antes de persistir y nunca las expone en la respuesta', async () => {
    bankService.findById.mockResolvedValue(makeBank());
    encryption.encrypt.mockResolvedValue('fp:ciphertext-real');
    repository.create.mockResolvedValue(makeAccount());
    const service = buildService();

    const result = await service.create({
      bankId: 'bank-1',
      merchantId: 'm1',
      accountNumber: '123',
      credentials: { u: 'a', p: 'b' },
    });

    expect(encryption.encrypt).toHaveBeenCalledWith(JSON.stringify({ u: 'a', p: 'b' }));
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ encryptedCredentials: 'fp:ciphertext-real' }),
    );
    // El objeto que vuelve del service es {account, bankName}; el DTO de respuesta
    // (bank-account-response.dto.ts) es el que garantiza que esto no se serialice,
    // pero aquí confirmamos que el propio dominio no inventa un campo de texto plano.
    expect(result.account).not.toHaveProperty('credentials');
  });

  it('usa el intervalo de sync por defecto de config si no se especifica uno', async () => {
    bankService.findById.mockResolvedValue(makeBank());
    encryption.encrypt.mockResolvedValue('fp:ct');
    repository.create.mockResolvedValue(makeAccount());
    configService.get.mockReturnValue(90);
    const service = buildService();

    await service.create({ bankId: 'bank-1', merchantId: 'm1', accountNumber: '123', credentials: { u: 'a' } });

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ syncIntervalSeconds: 90 }));
  });

  it('respeta un syncIntervalSeconds explícito por encima del default', async () => {
    bankService.findById.mockResolvedValue(makeBank());
    encryption.encrypt.mockResolvedValue('fp:ct');
    repository.create.mockResolvedValue(makeAccount());
    configService.get.mockReturnValue(90);
    const service = buildService();

    await service.create({
      bankId: 'bank-1',
      merchantId: 'm1',
      accountNumber: '123',
      credentials: { u: 'a' },
      syncIntervalSeconds: 30,
    });

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ syncIntervalSeconds: 30 }));
  });

  it('bloquea reactivar una cuenta que requiere reautenticación', async () => {
    repository.findByIdWithBank.mockResolvedValue({
      account: makeAccount({ status: AccountStatus.REAUTH_REQUIRED }),
      bankName: 'Nequi',
    });
    const service = buildService();

    await expect(service.reactivate('acc-1')).rejects.toThrow(ConflictException);
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  it('permite reactivar una cuenta suspendida (no bloqueada por reautenticación)', async () => {
    repository.findByIdWithBank
      .mockResolvedValueOnce({ account: makeAccount({ status: AccountStatus.SUSPENDED }), bankName: 'Nequi' })
      .mockResolvedValueOnce({ account: makeAccount({ status: AccountStatus.ACTIVE }), bankName: 'Nequi' });
    const service = buildService();

    const result = await service.reactivate('acc-1');

    expect(repository.updateStatus).toHaveBeenCalledWith('acc-1', AccountStatus.ACTIVE);
    expect(result.account.status).toBe(AccountStatus.ACTIVE);
    expect(auditService.logAdminOperation).toHaveBeenCalledWith('REACTIVATE', 'BankAccount', 'acc-1', 'api');
  });

  it('suspend() marca la cuenta SUSPENDED y audita la operación administrativa', async () => {
    repository.findByIdWithBank
      .mockResolvedValueOnce({ account: makeAccount(), bankName: 'Nequi' })
      .mockResolvedValueOnce({ account: makeAccount({ status: AccountStatus.SUSPENDED }), bankName: 'Nequi' });
    const service = buildService();

    const result = await service.suspend('acc-1');

    expect(repository.updateStatus).toHaveBeenCalledWith('acc-1', AccountStatus.SUSPENDED);
    expect(auditService.logAdminOperation).toHaveBeenCalledWith('SUSPEND', 'BankAccount', 'acc-1', 'api');
    expect(result.account.status).toBe(AccountStatus.SUSPENDED);
  });

  it('enableSync()/disableSync() auditan el cambio como CONFIG_CHANGE', async () => {
    repository.findByIdWithBank.mockResolvedValue({ account: makeAccount(), bankName: 'Nequi' });
    const service = buildService();

    await service.enableSync('acc-1');
    expect(auditService.logConfigChange).toHaveBeenCalledWith('BankAccount', 'acc-1', 'api', { syncEnabled: true });

    await service.disableSync('acc-1');
    expect(auditService.logConfigChange).toHaveBeenCalledWith('BankAccount', 'acc-1', 'api', { syncEnabled: false });
  });

  it('requestManualSync valida las reglas de negocio pero informa que el motor de sync no existe', async () => {
    repository.findByIdWithBank.mockResolvedValue({ account: makeAccount(), bankName: 'Nequi' });
    const service = buildService();

    await expect(service.requestManualSync('acc-1')).rejects.toThrow(NotImplementedException);
  });

  it('requestManualSync rechaza cuentas con sync deshabilitado antes de llegar al 501', async () => {
    repository.findByIdWithBank.mockResolvedValue({
      account: makeAccount({ syncEnabled: false }),
      bankName: 'Nequi',
    });
    const service = buildService();

    await expect(service.requestManualSync('acc-1')).rejects.toThrow(BadRequestException);
  });

  it('requestManualSync rechaza cuentas suspendidas antes de llegar al 501', async () => {
    repository.findByIdWithBank.mockResolvedValue({
      account: makeAccount({ status: AccountStatus.SUSPENDED }),
      bankName: 'Nequi',
    });
    const service = buildService();

    await expect(service.requestManualSync('acc-1')).rejects.toThrow(BadRequestException);
  });

  it('updateCredentials re-cifra y la cuenta vuelve a estado PENDING', async () => {
    repository.findByIdWithBank
      .mockResolvedValueOnce({ account: makeAccount(), bankName: 'Nequi' })
      .mockResolvedValueOnce({ account: makeAccount({ status: AccountStatus.PENDING }), bankName: 'Nequi' });
    encryption.encrypt.mockResolvedValue('fp2:nuevo-ciphertext');
    const service = buildService();

    const result = await service.updateCredentials('acc-1', { credentials: { u: 'nuevo' } });

    expect(repository.updateCredentials).toHaveBeenCalledWith('acc-1', 'fp2:nuevo-ciphertext');
    expect(result.account.status).toBe(AccountStatus.PENDING);
    expect(auditService.logConfigChange).toHaveBeenCalledWith('BankAccount', 'acc-1', 'api', {
      credentialsRotated: true,
    });
  });

  it('getDecryptedCredentials descifra y parsea, pero solo se usa internamente (nunca hay controller que lo exponga)', async () => {
    repository.findById.mockResolvedValue(makeAccount());
    encryption.decrypt.mockResolvedValue(JSON.stringify({ phone: '3001234567', pin: '1234' }));
    const service = buildService();

    const credentials = await service.getDecryptedCredentials('acc-1');

    expect(credentials).toEqual({ phone: '3001234567', pin: '1234' });
  });

  it('markError() delega en updateStatus con AccountStatus.ERROR', async () => {
    const service = buildService();

    await service.markError('acc-1');

    expect(repository.updateStatus).toHaveBeenCalledWith('acc-1', AccountStatus.ERROR);
  });
});
