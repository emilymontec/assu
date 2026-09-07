/**
 * SyncEngineService se usa solo como TIPO en el constructor, pero
 * NestJS necesita esa metadata en runtime — y SyncEngineService importa
 * (para tipar SUS propios parámetros) BankAccountService/BankService/
 * SyncLogService, que sí tocan Prisma. Sin estos mocks, Jest arrastraría
 * esa cadena completa hasta @prisma/client.
 */
jest.mock('../../bank-account/bank-account.service', () => ({ BankAccountService: class {} }));
jest.mock('../../bank/bank.service', () => ({ BankService: class {} }));
jest.mock('../../sync-log/sync-log.service', () => ({ SyncLogService: class {} }));

// eslint-disable-next-line import/first
import { UnrecoverableError } from 'bullmq';
// eslint-disable-next-line import/first
import { SyncProcessor } from './sync.processor';

function makeFakeJob(overrides: Partial<{ id: string; accountId: string; attemptsMade: number; attempts: number }> = {}) {
  return {
    id: overrides.id ?? 'job-1',
    data: { accountId: overrides.accountId ?? 'acc-1' },
    attemptsMade: overrides.attemptsMade ?? 0,
    opts: { attempts: overrides.attempts ?? 3 },
  } as any;
}

describe('SyncProcessor', () => {
  const syncEngineService = { syncAccount: jest.fn() };
  const retryErrorHandlingService = { classify: jest.fn() };
  const metricsService = { recordRetry: jest.fn() };

  function buildProcessor(): SyncProcessor {
    return new SyncProcessor(syncEngineService as any, retryErrorHandlingService as any, metricsService as any);
  }

  beforeEach(() => jest.clearAllMocks());

  it('process() delega en SyncEngineService.syncAccount() con el accountId del job', async () => {
    syncEngineService.syncAccount.mockResolvedValue({ movementsFound: 3, movementsNew: 1 });
    const processor = buildProcessor();
    const job = makeFakeJob({ accountId: 'acc-1' });

    const result = await processor.process(job);

    expect(syncEngineService.syncAccount).toHaveBeenCalledWith('acc-1');
    expect(result).toEqual({ movementsFound: 3, movementsNew: 1 });
  });

  it('process() re-lanza el error tal cual si es transitorio (deja que BullMQ reintente)', async () => {
    syncEngineService.syncAccount.mockRejectedValue(new Error('Timeout de red'));
    retryErrorHandlingService.classify.mockReturnValue({ retryable: true, reason: 'Timeout de red' });
    const processor = buildProcessor();

    await expect(processor.process(makeFakeJob())).rejects.toThrow('Timeout de red');
    await expect(processor.process(makeFakeJob())).rejects.not.toBeInstanceOf(UnrecoverableError);
    expect(metricsService.recordRetry).toHaveBeenCalledTimes(2);
  });

  it('process() lanza UnrecoverableError si el error es permanente (BullMQ NO debe reintentar)', async () => {
    syncEngineService.syncAccount.mockRejectedValue(new Error('Credenciales inválidas'));
    retryErrorHandlingService.classify.mockReturnValue({ retryable: false, reason: 'Credenciales inválidas' });
    const processor = buildProcessor();

    await expect(processor.process(makeFakeJob())).rejects.toBeInstanceOf(UnrecoverableError);
    expect(metricsService.recordRetry).not.toHaveBeenCalled();
  });

  it('onCompleted() no lanza al recibir el evento (solo registra)', () => {
    const processor = buildProcessor();
    const job = makeFakeJob();

    expect(() => processor.onCompleted(job, { movementsFound: 2, movementsNew: 2 })).not.toThrow();
  });

  it('onFailed() no lanza aunque el job venga undefined', () => {
    const processor = buildProcessor();

    expect(() => processor.onFailed(undefined, new Error('boom'))).not.toThrow();
  });
});
