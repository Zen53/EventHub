import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerStorageService } from '@nestjs/throttler';
import { AppError } from '../errors/app-error.js';
import { RateLimit } from './rate-limit.decorator.js';
import { RateLimitGuard } from './rate-limit.guard.js';

class LimitedController {
  @RateLimit({ limit: 2, windowMs: 60 * 1000 })
  first() {}

  @RateLimit({ limit: 2, windowMs: 60 * 1000 })
  second() {}
}

type Route = 'first' | 'second';

const contextFor = (ip: string, route: Route = 'first') => {
  const header = vi.fn();
  const context = {
    getHandler: () => LimitedController.prototype[route],
    getClass: () => LimitedController,
    switchToHttp: () => ({
      getRequest: () => ({ ip, headers: {} }),
      getResponse: () => ({ header }),
    }),
  } as unknown as ExecutionContext;
  return { context, header };
};

describe('RateLimitGuard', () => {
  let storage: ThrottlerStorageService;
  let guard: RateLimitGuard;

  const attempt = (ip: string, route?: Route) =>
    guard.canActivate(contextFor(ip, route).context);

  beforeEach(async () => {
    vi.useFakeTimers();
    storage = new ThrottlerStorageService();
    guard = new RateLimitGuard(
      [{ limit: 60, ttl: 60 * 1000 }],
      storage,
      new Reflector(),
    );
    await guard.onModuleInit();
  });

  afterEach(() => {
    storage.onApplicationShutdown();
    vi.useRealTimers();
  });

  it('lets through the requests of an IP address up to the limit of the route', async () => {
    await expect(attempt('203.0.113.1')).resolves.toBe(true);
    await expect(attempt('203.0.113.1')).resolves.toBe(true);
  });

  it('answers 429 TOO_MANY_REQUESTS past the limit, with a Retry-After header', async () => {
    await attempt('203.0.113.1');
    await attempt('203.0.113.1');
    const { context, header } = contextFor('203.0.113.1');

    const error = await guard.canActivate(context).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ status: 429, code: 'TOO_MANY_REQUESTS' });
    expect(header).toHaveBeenCalledWith('Retry-After', expect.any(Number));
  });

  it('counts each IP address apart', async () => {
    await attempt('203.0.113.1');
    await attempt('203.0.113.1');

    await expect(attempt('203.0.113.2')).resolves.toBe(true);
  });

  it('counts each route apart', async () => {
    await attempt('203.0.113.1');
    await attempt('203.0.113.1');

    await expect(attempt('203.0.113.1', 'second')).resolves.toBe(true);
  });

  it('lets the IP address through again once the window has passed', async () => {
    await attempt('203.0.113.1');
    await attempt('203.0.113.1');
    await expect(attempt('203.0.113.1')).rejects.toBeInstanceOf(AppError);

    vi.advanceTimersByTime(60 * 1000 + 1);

    await expect(attempt('203.0.113.1')).resolves.toBe(true);
  });
});
