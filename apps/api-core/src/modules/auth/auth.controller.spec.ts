import { HttpStatus, RequestMethod } from '@nestjs/common';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
  ROUTE_ARGS_METADATA,
} from '@nestjs/common/constants.js';
import { registerBodySchema } from '@eventhub/schemas';
import { AppError } from '../../core/errors/app-error.js';
import { IS_PUBLIC_KEY } from '../../core/security/public.decorator.js';
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

const handler = Object.getOwnPropertyDescriptor(
  AuthController.prototype,
  'register',
)?.value as object;

function setup() {
  const auth = { register: vi.fn().mockResolvedValue(row) };
  const controller = new AuthController(auth as unknown as AuthService);
  return { controller, auth };
}

function bodySchema() {
  const args = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    AuthController,
    'register',
  ) as Record<string, { index: number; schema?: unknown }>;
  return Object.values(args).find((arg) => arg.index === 0)?.schema;
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
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
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
