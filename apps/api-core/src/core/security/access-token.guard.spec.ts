import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppError } from '../errors/app-error.js';
import { AccessTokenGuard } from './access-token.guard.js';
import type { AccessTokenService } from './access-token.service.js';
import type { AuthenticatedRequest } from './authenticated-user.js';
import { Public } from './public.decorator.js';

class OpenController {
  @Public()
  route() {}
}

@Public()
class PublicController {
  route() {}
}

class ProtectedController {
  route() {}
}

const contextFor = (
  controller: { prototype: { route: () => void } },
  headers: Record<string, string> = {},
) => {
  const request = { headers } as unknown as AuthenticatedRequest;
  const context = {
    getHandler: () => controller.prototype.route,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
};

describe('AccessTokenGuard', () => {
  const verify = vi.fn();
  const guard = new AccessTokenGuard(new Reflector(), {
    verify,
  } as unknown as AccessTokenService);

  afterEach(() => {
    verify.mockReset();
  });

  it.each([OpenController, PublicController])(
    'lets a @Public() route through without a token (%o)',
    async (controller) => {
      const { context, request } = contextFor(controller);
      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(request.user).toBeUndefined();
      expect(verify).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['no Authorization header', {}],
    ['an empty header', { authorization: '' }],
    ['no Bearer prefix', { authorization: 'a.b.c' }],
    ['another scheme', { authorization: 'Basic dXNlcjpwYXNz' }],
    ['Bearer without a token', { authorization: 'Bearer ' }],
    ['two tokens', { authorization: 'Bearer a.b.c d.e.f' }],
  ])('answers 401 UNAUTHORIZED with %s', async (_, headers) => {
    const { context } = contextFor(ProtectedController, headers);
    const error = await guard.canActivate(context).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
    expect(verify).not.toHaveBeenCalled();
  });

  it('answers 401 UNAUTHORIZED with an invalid token', async () => {
    verify.mockRejectedValue(
      new AppError(401, 'UNAUTHORIZED', 'Invalid or expired access token'),
    );
    const { context, request } = contextFor(ProtectedController, {
      authorization: 'Bearer a.b.c',
    });
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    });
    expect(verify).toHaveBeenCalledWith('a.b.c');
    expect(request.user).toBeUndefined();
  });

  it('attaches { userId } to the request for a valid token', async () => {
    verify.mockResolvedValue({ userId: 'user-1' });
    const { context, request } = contextFor(ProtectedController, {
      authorization: 'bearer a.b.c',
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verify).toHaveBeenCalledWith('a.b.c');
    expect(request.user).toEqual({ userId: 'user-1' });
  });
});
