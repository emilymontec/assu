/**
 * BankAccountService se importa solo como TIPO en el constructor, pero
 * NestJS necesita esa metadata en runtime (emitDecoratorMetadata) — sin
 * este mock, Jest arrastraría la cadena real hasta @prisma/client. `Queue`
 * de 'bullmq' se usa también solo como tipo y no necesita mock: importar
 * la clase no abre ninguna conexión (solo instanciarla lo haría, y aquí
 * nunca se instancia una real — se inyecta un objeto fake directamente).
 */
jest.mock('../bank-account/bank-account.service', () => ({ BankAccountService: class {} }));

// eslint-disable-next-line import/first
import { SchedulerService } from './scheduler.service';
import { AccountStatus } from '../../core/domain/bank-account/account-status.enum';
import { BankAccount } from '../../core/domain/bank-account/bank-account.entity';

function makeAccount(
  id: string,
  overrides: Partial<{ status: AccountStatus; syncEnabled: boolean; syncIntervalSeconds: number }> = {},
): { account: BankAccount; bankName: string } {
  const account = new BankAccount(
    id,
    'bank-1',
    'merchant-1',
    '3001234567',
    'fp:ct',
    overrides.status ?? AccountStatus.ACTIVE,
    overrides.syncEnabled ?? true,
    overrides.syncIntervalSeconds ?? 60,
    null,
    null,
    new Date(),
    new Date(),
  );
  return { account, bankName: 'Nequi' };
}

function makeFakeQueue() {
  return {
    add: jest.fn(),
    getRepeatableJobs: jest.fn().mockResolvedValue([]),
    removeRepeatableByKey: jest.fn(),
  };
}

describe('SchedulerService', () => {
  const bankAccountService = { findAll: jest.fn() };

  function buildService(queue = makeFakeQueue()) {
    return { service: new SchedulerService(queue as any, bankAccountService as any), queue };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('scheduleAccount() primero desprograma y luego agrega el job repetible con la frecuencia dada', async () => {
    const { service, queue } = buildService();

    await service.scheduleAccount('acc-1', 120);

    expect(queue.getRepeatableJobs).toHaveBeenCalled(); // parte de unscheduleAccount()
    expect(queue.add).toHaveBeenCalledWith(
      expect.any(String),
      { accountId: 'acc-1' },
      expect.objectContaining({
        jobId: 'acc-1',
        repeat: { every: 120_000 },
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      }),
    );
  });

  it('scheduleAccount() es idempotente: no duplica si ya había una programación previa', async () => {
    const queue = makeFakeQueue();
    queue.getRepeatableJobs.mockResolvedValue([{ id: 'acc-1', key: 'old-key' }]);
    const { service } = buildService(queue);

    await service.scheduleAccount('acc-1', 60);

    expect(queue.removeRepeatableByKey).toHaveBeenCalledWith('old-key');
    expect(queue.add).toHaveBeenCalledTimes(1);
  });

  it('unscheduleAccount() solo borra los jobs repetibles que pertenecen a esa cuenta', async () => {
    const queue = makeFakeQueue();
    queue.getRepeatableJobs.mockResolvedValue([
      { id: 'acc-1', key: 'key-1' },
      { id: 'acc-2', key: 'key-2' },
    ]);
    const { service } = buildService(queue);

    await service.unscheduleAccount('acc-1');

    expect(queue.removeRepeatableByKey).toHaveBeenCalledWith('key-1');
    expect(queue.removeRepeatableByKey).not.toHaveBeenCalledWith('key-2');
  });

  it('scheduleAllActiveAccounts() programa solo cuentas ACTIVE/PENDING con sync habilitado', async () => {
    bankAccountService.findAll.mockResolvedValue([
      makeAccount('acc-active', { status: AccountStatus.ACTIVE }),
      makeAccount('acc-pending', { status: AccountStatus.PENDING }),
      makeAccount('acc-suspended', { status: AccountStatus.SUSPENDED }),
      makeAccount('acc-reauth', { status: AccountStatus.REAUTH_REQUIRED }),
      makeAccount('acc-disabled', { syncEnabled: false }),
    ]);
    const { service, queue } = buildService();

    const result = await service.scheduleAllActiveAccounts();

    expect(result.scheduled).toBe(2);
    const scheduledIds = queue.add.mock.calls.map((call: unknown[]) => (call[1] as { accountId: string }).accountId);
    expect(scheduledIds.sort()).toEqual(['acc-active', 'acc-pending']);
  });

  it('scheduleAllActiveAccounts() desprograma cuentas que ya no son sincronizables', async () => {
    bankAccountService.findAll.mockResolvedValue([makeAccount('acc-suspended', { status: AccountStatus.SUSPENDED })]);
    const queue = makeFakeQueue();
    queue.getRepeatableJobs.mockResolvedValue([{ id: 'acc-suspended', key: 'key-1' }]);
    const { service } = buildService(queue);

    await service.scheduleAllActiveAccounts();

    expect(queue.removeRepeatableByKey).toHaveBeenCalledWith('key-1');
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('respeta el intervalo por cuenta (syncIntervalSeconds) al programar en lote', async () => {
    bankAccountService.findAll.mockResolvedValue([makeAccount('acc-1', { syncIntervalSeconds: 300 })]);
    const { service, queue } = buildService();

    await service.scheduleAllActiveAccounts();

    expect(queue.add).toHaveBeenCalledWith(
      expect.any(String),
      { accountId: 'acc-1' },
      expect.objectContaining({ repeat: { every: 300_000 } }),
    );
  });

  it('listScheduledAccountIds() devuelve los ids de las cuentas con job repetible activo', async () => {
    const queue = makeFakeQueue();
    queue.getRepeatableJobs.mockResolvedValue([{ id: 'acc-1' }, { id: 'acc-2' }, { id: null }]);
    const { service } = buildService(queue);

    const ids = await service.listScheduledAccountIds();

    expect(ids).toEqual(['acc-1', 'acc-2']);
  });

  it('onModuleInit() no lanza si scheduleAllActiveAccounts() falla (ej. DB no lista aún)', async () => {
    bankAccountService.findAll.mockRejectedValue(new Error('DB no disponible'));
    const { service } = buildService();

    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });
});
