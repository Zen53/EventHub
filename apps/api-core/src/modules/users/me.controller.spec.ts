import { userSchema } from '@eventhub/schemas';
import { RequestMethod } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppError } from '../../core/errors/app-error.js';
import { IS_PUBLIC_KEY } from '../../core/security/public.decorator.js';
import { MeController } from './me.controller.js';
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
  const users = { findById: vi.fn() };
  const controller = new MeController(users as unknown as UsersService);
  return { controller, users };
}

describe('MeController.getMe', () => {
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

describe('MeController routing', () => {
  const reflector = new Reflector();
  const handler = Object.getOwnPropertyDescriptor(
    MeController.prototype,
    'getMe',
  )?.value as () => unknown;

  it('is mounted on GET /me', () => {
    expect(reflector.get('path', MeController)).toBe('me');
    expect(reflector.get('path', handler)).toBe('/');
    expect(reflector.get('method', handler)).toBe(RequestMethod.GET);
  });

  it('is registered in UsersModule', () => {
    expect(reflector.get('controllers', UsersModule)).toContain(MeController);
  });

  it('is not public, neither on the class nor on the handler', () => {
    expect(reflector.get(IS_PUBLIC_KEY, MeController)).toBeUndefined();
    expect(reflector.get(IS_PUBLIC_KEY, handler)).toBeUndefined();
  });
});
