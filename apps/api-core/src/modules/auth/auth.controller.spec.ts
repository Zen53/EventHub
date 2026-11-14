import { HttpStatus, RequestMethod } from '@nestjs/common';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
  RESPONSE_PASSTHROUGH_METADATA,
  ROUTE_ARGS_METADATA,
} from '@nestjs/common/constants.js';
import { loginBodySchema, registerBodySchema } from '@eventhub/schemas';
import type { Request, Response } from 'express';
import { AppError } from '../../core/errors/app-error.js';
import { Public } from '../../core/security/index.js';
import { createValidationPipe } from '../../core/validation/validation.pipe.js';
import type { UserRow } from '../users/index.js';
import { AuthController } from './auth.controller.js';
import type { AuthService } from './auth.service.js';

const row: UserRow = {
  id: 'a1b2c3d4-0000-4000-8000-000000000002',
  email: 'camille@exemple.fr',
  firstName: 'Camille',
  lastName: 'Durand',
  phone: '+33612345678',
  passwordHash: 'stored-hash',
  createdAt: new Date('2026-11-13T10:00:00Z'),
  updatedAt: new Date('2026-11-13T10:00:00Z'),
};

const body = {
  email: 'camille@exemple.fr',
  password: 'motdepasse123',
  firstName: 'Camille',
  lastName: 'Durand',
  phone: '+33612345678',
};

type Route = 'register' | 'login' | 'logout';

const handlerOf = (name: Route) =>
  Object.getOwnPropertyDescriptor(AuthController.prototype, name)
    ?.value as object;

const handler = handlerOf('register');

const loginResult = {
  accessToken: 'signed-access-token',
  refreshToken: {
    token: 'signed-refresh-token',
    jti: 'c1b2c3d4-0000-4000-8000-000000000003',
    expiresAt: new Date('2026-11-20T10:00:00Z'),
  },
  user: row,
};

function setup() {
  const auth = {
    register: vi.fn().mockResolvedValue(row),
    login: vi.fn().mockResolvedValue(loginResult),
    logout: vi.fn().mockResolvedValue(undefined),
  };
  const controller = new AuthController(auth as unknown as AuthService);
  return { controller, auth };
}

function routeArgs(name: Route) {
  return Object.values(
    Reflect.getMetadata(ROUTE_ARGS_METADATA, AuthController, name) as Record<
      string,
      { index: number; schema?: unknown }
    >,
  );
}

function bodySchema(name: 'register' | 'login' = 'register') {
  return routeArgs(name).find((arg) => arg.index === 0)?.schema;
}

function publicKey() {
  class Probe {}
  Public()(Probe);
  const [key] = Reflect.getMetadataKeys(Probe) as unknown[];
  return key;
}

describe('AuthController', () => {
  it('is mounted on POST /auth/register and answers 201', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AuthController)).toBe('auth');
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('register');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
      RequestMethod.POST,
    );
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(
      HttpStatus.CREATED,
    );
  });

  it('marks the register route as public', () => {
    expect(Reflect.getMetadata(publicKey(), handler)).toBe(true);
  });

  it('validates the body with registerBodySchema', () => {
    expect(bodySchema()).toBe(registerBodySchema);
  });

  it('returns the created User without passwordHash', async () => {
    const { controller, auth } = setup();

    const response = await controller.register(body);

    expect(auth.register).toHaveBeenCalledWith(body);
    expect(response).toEqual({
      id: row.id,
      email: 'camille@exemple.fr',
      firstName: 'Camille',
      lastName: 'Durand',
      phone: '+33612345678',
      createdAt: '2026-11-13T10:00:00.000Z',
      updatedAt: '2026-11-13T10:00:00.000Z',
    });
    expect(response).not.toHaveProperty('passwordHash');
    expect(response).not.toHaveProperty('password');
  });

  it('propagates 409 EMAIL_ALREADY_USED as is', async () => {
    const { controller, auth } = setup();
    const error = new AppError(
      409,
      'EMAIL_ALREADY_USED',
      'Cet email est déjà associé à un compte.',
    );
    auth.register.mockRejectedValue(error);

    await expect(controller.register(body)).rejects.toBe(error);
  });
});

describe('AuthController.login', () => {
  const login = handlerOf('login');
  const credentials = {
    email: 'camille@exemple.fr',
    password: 'motdepasse123',
  };

  it('is mounted on POST /auth/login, public, and answers 200', () => {
    expect(Reflect.getMetadata(PATH_METADATA, login)).toBe('login');
    expect(Reflect.getMetadata(METHOD_METADATA, login)).toBe(
      RequestMethod.POST,
    );
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, login)).toBe(HttpStatus.OK);
    expect(Reflect.getMetadata(publicKey(), login)).toBe(true);
  });

  it('validates the body with loginBodySchema and uses a passthrough response', () => {
    expect(bodySchema('login')).toBe(loginBodySchema);
    expect(
      Reflect.getMetadata(
        RESPONSE_PASSTHROUGH_METADATA,
        AuthController,
        'login',
      ),
    ).toBe(true);
  });

  it('sets the refresh token cookie with the contract options', async () => {
    const { controller, auth } = setup();
    const response = { cookie: vi.fn() };

    await controller.login(credentials, response as unknown as Response);

    expect(auth.login).toHaveBeenCalledWith(credentials);
    expect(response.cookie).toHaveBeenCalledTimes(1);
    expect(response.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'signed-refresh-token',
      {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/auth',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    );
  });

  it('answers the access token and the user, without refresh token nor passwordHash', async () => {
    const { controller } = setup();
    const response = { cookie: vi.fn() };

    const body = await controller.login(
      credentials,
      response as unknown as Response,
    );

    expect(body).toEqual({
      accessToken: 'signed-access-token',
      user: {
        id: row.id,
        email: 'camille@exemple.fr',
        firstName: 'Camille',
        lastName: 'Durand',
        phone: '+33612345678',
        createdAt: '2026-11-13T10:00:00.000Z',
        updatedAt: '2026-11-13T10:00:00.000Z',
      },
    });
    expect(body).not.toHaveProperty('refreshToken');
    expect(body.user).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(body)).not.toContain('signed-refresh-token');
    expect(JSON.stringify(body)).not.toContain('stored-hash');
  });

  it('propagates 401 INVALID_CREDENTIALS without setting a cookie', async () => {
    const { controller, auth } = setup();
    const response = { cookie: vi.fn() };
    const error = new AppError(
      401,
      'INVALID_CREDENTIALS',
      'Email ou mot de passe incorrect.',
    );
    auth.login.mockRejectedValue(error);

    await expect(
      controller.login(credentials, response as unknown as Response),
    ).rejects.toBe(error);
    expect(response.cookie).not.toHaveBeenCalled();
  });
});

describe('AuthController.logout', () => {
  const logout = handlerOf('logout');
  const clearedScope = {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/auth',
  };

  const call = (controller: AuthController, cookies: unknown) => {
    const response = { clearCookie: vi.fn(), cookie: vi.fn() };
    const request = { cookies };
    return {
      response,
      result: controller.logout(
        request as unknown as Request,
        response as unknown as Response,
      ),
    };
  };

  it('is mounted on POST /auth/logout, public, and answers 204', () => {
    expect(Reflect.getMetadata(PATH_METADATA, logout)).toBe('logout');
    expect(Reflect.getMetadata(METHOD_METADATA, logout)).toBe(
      RequestMethod.POST,
    );
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, logout)).toBe(
      HttpStatus.NO_CONTENT,
    );
    expect(Reflect.getMetadata(publicKey(), logout)).toBe(true);
    expect(
      Reflect.getMetadata(
        RESPONSE_PASSTHROUGH_METADATA,
        AuthController,
        'logout',
      ),
    ).toBe(true);
  });

  it('passes the refresh token cookie to the service, clears the cookie and returns no body', async () => {
    const { controller, auth } = setup();

    const { response, result } = call(controller, {
      refreshToken: 'signed-refresh-token',
    });

    await expect(result).resolves.toBeUndefined();
    expect(auth.logout).toHaveBeenCalledWith('signed-refresh-token');
    expect(response.clearCookie).toHaveBeenCalledTimes(1);
    expect(response.clearCookie).toHaveBeenCalledWith(
      'refreshToken',
      clearedScope,
    );
    expect(response.cookie).not.toHaveBeenCalled();
  });

  it.each([
    ['without cookies', undefined],
    ['without the refreshToken cookie', {}],
    ['with a non-string refreshToken cookie', { refreshToken: { a: 1 } }],
  ])('clears the cookie %s and passes no token', async (_, cookies) => {
    const { controller, auth } = setup();

    const { response, result } = call(controller, cookies);

    await expect(result).resolves.toBeUndefined();
    expect(auth.logout).toHaveBeenCalledWith(undefined);
    expect(response.clearCookie).toHaveBeenCalledWith(
      'refreshToken',
      clearedScope,
    );
  });

  it('propagates an infrastructure error without clearing the cookie', async () => {
    const { controller, auth } = setup();
    const error = new Error('connection refused');
    auth.logout.mockRejectedValue(error);

    const { response, result } = call(controller, {
      refreshToken: 'signed-refresh-token',
    });

    await expect(result).rejects.toBe(error);
    expect(response.clearCookie).not.toHaveBeenCalled();
  });
});

describe('validation of the register body by the global pipe', () => {
  const pipe = createValidationPipe();
  const metadata = { type: 'body' as const, schema: registerBodySchema };

  it('returns the parsed body, email lowercased', async () => {
    await expect(
      pipe.transform({ ...body, email: 'Camille@Exemple.FR' }, metadata),
    ).resolves.toEqual(body);
  });

  it('throws 400 VALIDATION_ERROR with field password', async () => {
    const error = await pipe
      .transform({ ...body, password: 'abc123' }, metadata)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    expect((error as AppError).details).toEqual([
      {
        field: 'password',
        message: 'Le mot de passe doit contenir au moins 8 caractères.',
      },
    ]);
  });

  it('reports one detail per invalid field', async () => {
    const error = await pipe
      .transform({ ...body, email: 'nope', firstName: '' }, metadata)
      .catch((e: unknown) => e);

    expect((error as AppError).details?.map((detail) => detail.field)).toEqual([
      'email',
      'firstName',
    ]);
  });

  it('throws 400 VALIDATION_ERROR on an unknown field', async () => {
    const error = await pipe
      .transform({ ...body, passwordHash: 'x' }, metadata)
      .catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    expect((error as AppError).details).toEqual([
      { field: '', message: 'Champ inconnu : passwordHash.' },
    ]);
  });
});
