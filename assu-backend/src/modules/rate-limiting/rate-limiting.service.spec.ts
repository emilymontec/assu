import { RateLimitingService } from './rate-limiting.service';
import { RateLimitExceededError } from '../../common/errors/transient.error';

function makeConfigService(values: Record<string, number>) {
  return { get: (key: string) => values[key] } as any;
}

describe('RateLimitingService', () => {
  const rateLimiter = { checkAndConsume: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  describe('checkBankLimit()', () => {
    it('no lanza si está dentro del límite', async () => {
      rateLimiter.checkAndConsume.mockResolvedValue(true);
      const service = new RateLimitingService(
        rateLimiter as any,
        makeConfigService({ 'rateLimiting.maxRequestsPerBankPerMinute': 20 }),
      );

      await expect(service.checkBankLimit('nequi')).resolves.toBeUndefined();
      expect(rateLimiter.checkAndConsume).toHaveBeenCalledWith('bank:nequi', 20, 60);
    });

    it('lanza RateLimitExceededError si se supera el límite', async () => {
      rateLimiter.checkAndConsume.mockResolvedValue(false);
      const service = new RateLimitingService(
        rateLimiter as any,
        makeConfigService({ 'rateLimiting.maxRequestsPerBankPerMinute': 20 }),
      );

      await expect(service.checkBankLimit('nequi')).rejects.toThrow(RateLimitExceededError);
    });

    it('usa 20 como default si la config no tiene el valor', async () => {
      rateLimiter.checkAndConsume.mockResolvedValue(true);
      const service = new RateLimitingService(rateLimiter as any, makeConfigService({}));

      await service.checkBankLimit('nequi');

      expect(rateLimiter.checkAndConsume).toHaveBeenCalledWith('bank:nequi', 20, 60);
    });
  });

  describe('checkAccountLimit()', () => {
    it('no lanza si está dentro del límite', async () => {
      rateLimiter.checkAndConsume.mockResolvedValue(true);
      const service = new RateLimitingService(
        rateLimiter as any,
        makeConfigService({ 'rateLimiting.minSecondsBetweenAccountSyncs': 10 }),
      );

      await expect(service.checkAccountLimit('acc-1')).resolves.toBeUndefined();
      expect(rateLimiter.checkAndConsume).toHaveBeenCalledWith('account:acc-1', 1, 10);
    });

    it('lanza RateLimitExceededError si la cuenta ya sincronizó hace muy poco', async () => {
      rateLimiter.checkAndConsume.mockResolvedValue(false);
      const service = new RateLimitingService(
        rateLimiter as any,
        makeConfigService({ 'rateLimiting.minSecondsBetweenAccountSyncs': 10 }),
      );

      await expect(service.checkAccountLimit('acc-1')).rejects.toThrow(RateLimitExceededError);
    });
  });
});
