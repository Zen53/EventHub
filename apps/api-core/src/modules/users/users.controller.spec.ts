import { updateMeBodySchema, userSchema } from '@eventhub/schemas';
import { RequestMethod } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants.js';
import { Reflector } from '@nestjs/core';
import { AppError } from '../../core/errors/app-error.js';
import { IS_PUBLIC_KEY } from '../../core/security/public.decorator.js';
import { createValidationPipe } from '../../core/validation/validation.pipe.js';
import { UsersController } from './users.controller.js';
import { UsersModule } from './users.module.js';
import type { UserRow } from './users.schema.js';
import type { UsersService } from './users.service.js';

const row: UserRow = {
  id: 'a1b2c3d4-0000-4000-8000-000000000002',
  email: 'camille@exemple.fr',
  firstName: 'Camille',
  lastName: 'Durand',
  phone: '+33612345678',
  passwordHash: '$argon2id$secret',
  createdAt: new Date('2026-11-13T10:00:00Z'),
  updatedAt: new Date('2026-11-14T08:30:00Z'),
};

function setup() {
  const users = { findById: vi.fn(), updateProfile: vi.fn() };
  const controller = new UsersController(users as unknown as UsersService);
  return { controller, users };
}

describe('UsersController.getMe', () => {
  it('returns the identified user, without the password hash and with ISO dates', async () => {
    const { controller, users } = setup();
    users.findById.mockResolvedValue(row);

    const user = await controller.getMe({ userId: row.id });

    expect(users.findById).toHaveBeenCalledWith(row.id);
    expect(user).toEqual({
      id: row.id,
      email: 'camille@exemple.fr',
      firstName: 'Camille',
      lastName: 'Durand',
      phone: '+33612345678',
      createdAt: '2026-11-13T10:00:00.000Z',
      updatedAt: '2026-11-14T08:30:00.000Z',
    });
    expect(user).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(user)).not.toContain('argon2');
    expect(userSchema.safeParse(user).success).toBe(true);
  });

  it('throws 401 UNAUTHORIZED when the user no longer exists', async () => {
    const { controller, users } = setup();
    users.findById.mockResolvedValue(null);

    const promise = controller.getMe({ userId: row.id });

    await expect(promise).rejects.toBeInstanceOf(AppError);
    await expect(promise).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  });
});

describe('UsersController.updateMe', () => {
  it('updates the identified user with the body and returns the User', async () => {
    const { controller, users } = setup();
    users.updateProfile.mockResolvedValue({ ...row, phone: null });
    const body = { firstName: 'Camille', phone: null };

    const user = await controller.updateMe({ userId: row.id }, body);

    expect(users.updateProfile).toHaveBeenCalledWith(row.id, body);
    expect(user).toEqual({
      id: row.id,
      email: 'camille@exemple.fr',
      firstName: 'Camille',
      lastName: 'Durand',
      phone: null,
      createdAt: '2026-11-13T10:00:00.000Z',
      updatedAt: '2026-11-14T08:30:00.000Z',
    });
    expect(user).not.toHaveProperty('passwordHash');
    expect(userSchema.safeParse(user).success).toBe(true);
  });

  it('lets the errors of the service through', async () => {
    const { controller, users } = setup();
    const error = new AppError('EMAIL_ALREADY_USED');
    users.updateProfile.mockRejectedValue(error);

    await expect(
      controller.updateMe(
        { userId: row.id },
        { email: 'pris@exemple.fr', currentPassword: 'motdepasse123' },
      ),
    ).rejects.toBe(error);
  });
});

function argSchema(method: 'updateMe', index: number) {
  const args = Object.values(
    Reflect.getMetadata(ROUTE_ARGS_METADATA, UsersController, method) as Record<
      string,
      { index: number; schema?: unknown }
    >,
  );
  return args.find((arg) => arg.index === index)?.schema;
}

function validateBody(body: unknown) {
  return createValidationPipe().transform(body, {
    type: 'body',
    schema: updateMeBodySchema,
  });
}

describe('UsersController body validation', () => {
  it('validates the PATCH /me body with updateMeBodySchema', () => {
    expect(argSchema('updateMe', 1)).toBe(updateMeBodySchema);
  });

  it('accepts a partial body', async () => {
    await expect(
      validateBody({ firstName: ' Camille ', phone: null }),
    ).resolves.toEqual({ firstName: 'Camille', phone: null });
  });

  it.each([
    [{}, ''],
    [{ email: 'camille.durand@exemple.fr' }, 'currentPassword'],
    [{ currentPassword: 'motdepasse123' }, 'currentPassword'],
    [{ firstName: 'Camille', id: row.id }, 'id'],
    [{ password: 'motdepasse123' }, 'password'],
  ])('throws 400 VALIDATION_ERROR for %j on %j', async (body, field) => {
    const promise = validateBody(body);

    await expect(promise).rejects.toBeInstanceOf(AppError);
    await expect(promise).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      details: [expect.objectContaining({ field })],
    });
  });
});

describe('UsersController routing', () => {
  const reflector = new Reflector();
  const handlerOf = (name: 'getMe' | 'updateMe') =>
    Object.getOwnPropertyDescriptor(UsersController.prototype, name)
      ?.value as () => unknown;

  it.each([
    ['getMe', RequestMethod.GET],
    ['updateMe', RequestMethod.PATCH],
  ] as const)('mounts %s on /me', (name, method) => {
    const handler = handlerOf(name);

    expect(reflector.get('path', UsersController)).toBe('me');
    expect(reflector.get('path', handler)).toBe('/');
    expect(reflector.get('method', handler)).toBe(method);
  });

  it('is registered in UsersModule', () => {
    expect(reflector.get('controllers', UsersModule)).toContain(
      UsersController,
    );
  });

  it.each(['getMe', 'updateMe'] as const)(
    'does not make %s public, neither on the class nor on the handler',
    (name) => {
      expect(reflector.get(IS_PUBLIC_KEY, UsersController)).toBeUndefined();
      expect(reflector.get(IS_PUBLIC_KEY, handlerOf(name))).toBeUndefined();
    },
  );
});
