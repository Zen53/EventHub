import { AppError } from '../../core/errors/app-error.js';
import type { AccessTokenService } from '../../core/security/index.js';
import type { UserRow, UsersService } from '../users/index.js';
import { AuthService } from './auth.service.js';
import type { RefreshTokenService } from './refresh-token.service.js';

const row: UserRow = {
  id: 'a1b2c3d4-0000-4000-8000-000000000002',
  email: 'camille@exemple.fr',
  firstName: 'Camille',
  lastName: 'Durand',
  phone: null,
  passwordHash: 'stored-hash',
  createdAt: new Date('2026-11-13T10:00:00Z'),
  updatedAt: new Date('2026-11-13T10:00:00Z'),
};

const body = {
  email: 'camille@exemple.fr',
  password: 'motdepasse123',
  firstName: 'Camille',
  lastName: 'Durand',
};

const credentials = { email: 'camille@exemple.fr', password: 'motdepasse123' };

const issued = {
  token: 'signed-refresh-token',
  jti: 'c1b2c3d4-0000-4000-8000-000000000003',
  expiresAt: new Date('2026-11-20T10:00:00Z'),
};

const verified = {
  userId: row.id,
  jti: issued.jti,
  expiresAt: issued.expiresAt,
};

const invalidRefreshToken = () =>
  new AppError(
    401,
    'INVALID_REFRESH_TOKEN',
    'Refresh token absent, expiré ou déjà utilisé.',
  );

function setup() {
  const users = {
    create: vi.fn().mockResolvedValue(row),
    verifyCredentials: vi.fn().mockResolvedValue(row),
    findById: vi.fn().mockResolvedValue(row),
  };
  const accessTokens = { sign: vi.fn().mockReturnValue('signed-access-token') };
  const refreshTokens = {
    issue: vi.fn().mockReturnValue(issued),
    verify: vi.fn().mockResolvedValue(verified),
    revoke: vi.fn().mockResolvedValue(true),
  };
  const service = new AuthService(
    users as unknown as UsersService,
    accessTokens as unknown as AccessTokenService,
    refreshTokens as unknown as RefreshTokenService,
  );
  return { service, users, accessTokens, refreshTokens };
}

describe('AuthService.register', () => {
  it('delegates to UsersService.create with the body', async () => {
    const { service, users } = setup();

    await expect(service.register(body)).resolves.toBe(row);
    expect(users.create).toHaveBeenCalledWith(body);
  });

  it('propagates 409 EMAIL_ALREADY_USED as is', async () => {
    const { service, users } = setup();
    const error = new AppError(
      409,
      'EMAIL_ALREADY_USED',
      'Cet email est déjà associé à un compte.',
    );
    users.create.mockRejectedValue(error);

    await expect(service.register(body)).rejects.toBe(error);
  });
});

describe('AuthService.login', () => {
  it('returns the access token, the refresh token and the user on valid credentials', async () => {
    const { service, users, accessTokens, refreshTokens } = setup();

    await expect(service.login(credentials)).resolves.toEqual({
      accessToken: 'signed-access-token',
      refreshToken: issued,
      user: row,
    });
    expect(users.verifyCredentials).toHaveBeenCalledWith(
      'camille@exemple.fr',
      'motdepasse123',
    );
    expect(accessTokens.sign).toHaveBeenCalledWith({ userId: row.id });
    expect(refreshTokens.issue).toHaveBeenCalledWith(row.id);
  });

  const loginError = (service: AuthService, email: string, password: string) =>
    service.login({ email, password }).catch((error: unknown) => error);

  it('throws the same 401 INVALID_CREDENTIALS for a wrong password and an unknown email', async () => {
    const { service, users, accessTokens, refreshTokens } = setup();
    users.verifyCredentials.mockResolvedValue(null);

    const wrongPassword = await loginError(
      service,
      'camille@exemple.fr',
      'mauvais',
    );
    const unknownEmail = await loginError(
      service,
      'inconnu@exemple.fr',
      'motdepasse123',
    );

    expect(wrongPassword).toBeInstanceOf(AppError);
    expect(wrongPassword).toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Email ou mot de passe incorrect.',
      details: null,
    });
    expect(unknownEmail).toBeInstanceOf(AppError);
    expect(unknownEmail).toEqual(wrongPassword);
    expect((unknownEmail as AppError).message).toBe(
      (wrongPassword as AppError).message,
    );
    expect(accessTokens.sign).not.toHaveBeenCalled();
    expect(refreshTokens.issue).not.toHaveBeenCalled();
  });
});

describe('AuthService.logout', () => {
  it.each([undefined, ''])(
    'does nothing without a cookie (%j)',
    async (token) => {
      const { service, refreshTokens } = setup();

      await expect(service.logout(token)).resolves.toBeUndefined();
      expect(refreshTokens.verify).not.toHaveBeenCalled();
      expect(refreshTokens.revoke).not.toHaveBeenCalled();
    },
  );

  it('revokes the jti of a valid token until its expiration', async () => {
    const { service, refreshTokens } = setup();

    await expect(
      service.logout('signed-refresh-token'),
    ).resolves.toBeUndefined();
    expect(refreshTokens.verify).toHaveBeenCalledWith('signed-refresh-token');
    expect(refreshTokens.revoke).toHaveBeenCalledWith({
      userId: row.id,
      jti: issued.jti,
      expiresAt: issued.expiresAt,
    });
  });

  it('succeeds without revoking an invalid or expired token', async () => {
    const { service, refreshTokens } = setup();
    refreshTokens.verify.mockRejectedValue(invalidRefreshToken());

    await expect(service.logout('forged-token')).resolves.toBeUndefined();
    expect(refreshTokens.revoke).not.toHaveBeenCalled();
  });

  it('succeeds for a token that was already revoked', async () => {
    const { service, refreshTokens } = setup();
    refreshTokens.revoke.mockResolvedValue(false);

    await expect(
      service.logout('signed-refresh-token'),
    ).resolves.toBeUndefined();
  });

  it('propagates a database error raised while revoking', async () => {
    const { service, refreshTokens } = setup();
    const error = new Error('connection refused');
    refreshTokens.revoke.mockRejectedValue(error);

    await expect(service.logout('signed-refresh-token')).rejects.toBe(error);
  });

  it('propagates an unexpected error raised while verifying', async () => {
    const { service, refreshTokens } = setup();
    const error = new Error('unexpected');
    refreshTokens.verify.mockRejectedValue(error);

    await expect(service.logout('signed-refresh-token')).rejects.toBe(error);
    expect(refreshTokens.revoke).not.toHaveBeenCalled();
  });

  it('propagates another AppError raised while verifying', async () => {
    const { service, refreshTokens } = setup();
    const error = new AppError(500, 'INTERNAL_ERROR', 'Erreur interne.');
    refreshTokens.verify.mockRejectedValue(error);

    await expect(service.logout('signed-refresh-token')).rejects.toBe(error);
  });
});

describe('AuthService.refresh', () => {
  const rotated = {
    token: 'rotated-refresh-token',
    jti: 'd1b2c3d4-0000-4000-8000-000000000004',
    expiresAt: new Date('2026-11-21T10:00:00Z'),
  };

  const refreshError = (service: AuthService, token: string | undefined) =>
    service.refresh(token).catch((error: unknown) => error);

  const expectInvalidRefreshToken = (error: unknown) => {
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      status: 401,
      code: 'INVALID_REFRESH_TOKEN',
      message: 'Refresh token absent, expiré ou déjà utilisé.',
    });
  };

  it.each([undefined, ''])(
    'throws 401 INVALID_REFRESH_TOKEN without a cookie (%j)',
    async (token) => {
      const { service, refreshTokens, accessTokens } = setup();

      expectInvalidRefreshToken(await refreshError(service, token));
      expect(refreshTokens.verify).not.toHaveBeenCalled();
      expect(refreshTokens.revoke).not.toHaveBeenCalled();
      expect(refreshTokens.issue).not.toHaveBeenCalled();
      expect(accessTokens.sign).not.toHaveBeenCalled();
    },
  );

  it('propagates 401 INVALID_REFRESH_TOKEN for an invalid or expired token', async () => {
    const { service, refreshTokens, accessTokens } = setup();
    const error = invalidRefreshToken();
    refreshTokens.verify.mockRejectedValue(error);

    await expect(service.refresh('forged-token')).rejects.toBe(error);
    expect(refreshTokens.revoke).not.toHaveBeenCalled();
    expect(refreshTokens.issue).not.toHaveBeenCalled();
    expect(accessTokens.sign).not.toHaveBeenCalled();
  });

  it('throws 401 INVALID_REFRESH_TOKEN for a token already used, without issuing a new one', async () => {
    const { service, users, refreshTokens, accessTokens } = setup();
    refreshTokens.revoke.mockResolvedValue(false);

    expectInvalidRefreshToken(
      await refreshError(service, 'signed-refresh-token'),
    );
    expect(refreshTokens.revoke).toHaveBeenCalledWith(verified);
    expect(users.findById).not.toHaveBeenCalled();
    expect(refreshTokens.issue).not.toHaveBeenCalled();
    expect(accessTokens.sign).not.toHaveBeenCalled();
  });

  it('never checks isRevoked before revoking', async () => {
    const { service, refreshTokens } = setup();
    const isRevoked = vi.fn().mockResolvedValue(false);
    Object.assign(refreshTokens, { isRevoked });

    await service.refresh('signed-refresh-token');

    expect(isRevoked).not.toHaveBeenCalled();
  });

  it('throws 401 INVALID_REFRESH_TOKEN for a deleted user, after revoking the old token', async () => {
    const { service, users, refreshTokens, accessTokens } = setup();
    users.findById.mockResolvedValue(null);

    expectInvalidRefreshToken(
      await refreshError(service, 'signed-refresh-token'),
    );
    expect(refreshTokens.revoke).toHaveBeenCalledWith(verified);
    expect(users.findById).toHaveBeenCalledWith(row.id);
    expect(refreshTokens.issue).not.toHaveBeenCalled();
    expect(accessTokens.sign).not.toHaveBeenCalled();
  });

  it('revokes the old token before issuing a new access token and a new refresh token', async () => {
    const { service, users, refreshTokens, accessTokens } = setup();
    refreshTokens.issue.mockReturnValue(rotated);

    const result = await service.refresh('signed-refresh-token');

    expect(result).toEqual({
      accessToken: 'signed-access-token',
      refreshToken: rotated,
    });
    expect(result.refreshToken.jti).not.toBe(verified.jti);
    expect(refreshTokens.verify).toHaveBeenCalledWith('signed-refresh-token');
    expect(refreshTokens.revoke).toHaveBeenCalledWith(verified);
    expect(users.findById).toHaveBeenCalledWith(row.id);
    expect(accessTokens.sign).toHaveBeenCalledWith({ userId: row.id });
    expect(refreshTokens.issue).toHaveBeenCalledWith(row.id);
    const [revokeOrder] = refreshTokens.revoke.mock.invocationCallOrder;
    const [findOrder] = users.findById.mock.invocationCallOrder;
    const [issueOrder] = refreshTokens.issue.mock.invocationCallOrder;
    const [signOrder] = accessTokens.sign.mock.invocationCallOrder;
    expect(revokeOrder).toBeLessThan(findOrder);
    expect(revokeOrder).toBeLessThan(issueOrder);
    expect(revokeOrder).toBeLessThan(signOrder);
  });

  it('propagates a database error raised while revoking, without issuing', async () => {
    const { service, refreshTokens, accessTokens } = setup();
    const error = new Error('connection refused');
    refreshTokens.revoke.mockRejectedValue(error);

    await expect(service.refresh('signed-refresh-token')).rejects.toBe(error);
    expect(refreshTokens.issue).not.toHaveBeenCalled();
    expect(accessTokens.sign).not.toHaveBeenCalled();
  });

  it('propagates a database error raised while loading the user, without issuing', async () => {
    const { service, users, refreshTokens } = setup();
    const error = new Error('connection refused');
    users.findById.mockRejectedValue(error);

    await expect(service.refresh('signed-refresh-token')).rejects.toBe(error);
    expect(refreshTokens.issue).not.toHaveBeenCalled();
  });
});
