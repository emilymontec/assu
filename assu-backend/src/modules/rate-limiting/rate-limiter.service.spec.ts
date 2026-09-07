import { RateLimiterService } from './rate-limiter.service';

function makeFakeRedis() {
  return {
    incr: jest.fn(),
    expire: jest.fn(),
  };
}

describe('RateLimiterService', () => {
  it('permite la solicitud si el contador está dentro del límite', async () => {
    const redis = makeFakeRedis();
    redis.incr.mockResolvedValue(3);
    const service = new RateLimiterService(redis as any);

    const allowed = await service.checkAndConsume('bank:nequi', 20, 60);

    expect(allowed).toBe(true);
    expect(redis.incr).toHaveBeenCalledWith('ratelimit:bank:nequi');
  });

  it('rechaza la solicitud si el contador supera el límite', async () => {
    const redis = makeFakeRedis();
    redis.incr.mockResolvedValue(21);
    const service = new RateLimiterService(redis as any);

    const allowed = await service.checkAndConsume('bank:nequi', 20, 60);

    expect(allowed).toBe(false);
  });

  it('establece el TTL solo en la primera solicitud de la ventana (INCR devuelve 1)', async () => {
    const redis = makeFakeRedis();
    redis.incr.mockResolvedValue(1);
    const service = new RateLimiterService(redis as any);

    await service.checkAndConsume('bank:nequi', 20, 60);

    expect(redis.expire).toHaveBeenCalledWith('ratelimit:bank:nequi', 60);
  });

  it('NO vuelve a establecer el TTL en solicitudes subsiguientes de la misma ventana', async () => {
    const redis = makeFakeRedis();
    redis.incr.mockResolvedValue(2);
    const service = new RateLimiterService(redis as any);

    await service.checkAndConsume('bank:nequi', 20, 60);

    expect(redis.expire).not.toHaveBeenCalled();
  });

  it('incrementa el contador aunque el resultado sea "no permitido" (cuenta intentos, no éxitos)', async () => {
    const redis = makeFakeRedis();
    redis.incr.mockResolvedValue(25);
    const service = new RateLimiterService(redis as any);

    await service.checkAndConsume('bank:nequi', 20, 60);

    expect(redis.incr).toHaveBeenCalledTimes(1);
  });
});
