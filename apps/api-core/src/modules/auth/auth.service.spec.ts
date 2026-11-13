import { AppError } from '../../core/errors/app-error.js';
import type { UserRow, UsersService } from '../users/index.js';
import { AuthService } from './auth.service.js';

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

function setup() {
  const users = { create: vi.fn().mockResolvedValue(row) };
  const service = new AuthService(users as unknown as UsersService);
  return { service, users };
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
