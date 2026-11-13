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
  token: 'opaque-refresh-token',
  expiresAt: new Date('2026-11-20T10:00:00Z'),
};

function setup() {
  const users = {
    create: vi.fn().mockResolvedValue(row),
    verifyCredentials: vi.fn().mockResolvedValue(row),
  };
  const accessTokens = { sign: vi.fn().mockReturnValue('signed-access-token') };
  const refreshTokens = { issue: vi.fn().mockResolvedValue(issued) };
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
