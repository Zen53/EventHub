import type { UpdateMeBody } from '@eventhub/schemas';
import { AppError } from '../../core/errors/app-error.js';
import type { PasswordHasher } from './password-hasher.js';
import type { UsersRepository } from './users.repository.js';
import type { UserRow } from './users.schema.js';
import { UsersService } from './users.service.js';

const row: UserRow = {
  id: 'a1b2c3d4-0000-4000-8000-000000000002',
  email: 'camille@exemple.fr',
  firstName: 'Camille',
  lastName: 'Durand',
  phone: null,
  passwordHash: 'stored-hash',
  refreshTokensRevokedAt: null,
  createdAt: new Date('2026-11-13T10:00:00Z'),
  updatedAt: new Date('2026-11-13T10:00:00Z'),
};

const input = {
  email: 'Camille@Exemple.FR',
  password: 'motdepasse123',
  firstName: 'Camille',
  lastName: 'Durand',
};

function setup() {
  const repository = {
    insert: vi.fn().mockResolvedValue(row),
    findByEmail: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    updatePassword: vi.fn().mockResolvedValue(true),
  };
  const hasher = {
    hash: vi.fn().mockResolvedValue('hashed'),
    verify: vi.fn(),
  };
  const service = new UsersService(
    repository as unknown as UsersRepository,
    hasher as unknown as PasswordHasher,
  );
  return { service, repository, hasher };
}

describe('UsersService.create', () => {
  it('trims the email', async () => {
    const { service, repository } = setup();

    await service.create({ ...input, email: ' camille@exemple.fr ' });

    expect(repository.insert).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'camille@exemple.fr' }),
    );
  });

  it('stores the email in lowercase and the hashed password, never the plain one', async () => {
    const { service, repository, hasher } = setup();

    await expect(service.create(input)).resolves.toBe(row);

    expect(hasher.hash).toHaveBeenCalledWith('motdepasse123');
    expect(repository.insert).toHaveBeenCalledWith({
      email: 'camille@exemple.fr',
      firstName: 'Camille',
      lastName: 'Durand',
      phone: null,
      passwordHash: 'hashed',
    });
    expect(hasher.hash.mock.invocationCallOrder[0]).toBeLessThan(
      repository.insert.mock.invocationCallOrder[0],
    );
  });

  it('keeps the phone when given', async () => {
    const { service, repository } = setup();

    await service.create({ ...input, phone: '+33612345678' });

    expect(repository.insert).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '+33612345678' }),
    );
  });

  it('throws 409 EMAIL_ALREADY_USED when the email is already taken', async () => {
    const { service, repository } = setup();
    repository.insert.mockResolvedValue(null);

    const promise = service.create(input);

    await expect(promise).rejects.toBeInstanceOf(AppError);
    await expect(promise).rejects.toMatchObject({
      status: 409,
      code: 'EMAIL_ALREADY_USED',
    });
  });

  it('rethrows any other error as is', async () => {
    const { service, repository } = setup();
    const error = new Error('boom');
    repository.insert.mockRejectedValue(error);

    await expect(service.create(input)).rejects.toBe(error);
  });
});

describe('UsersService.findById', () => {
  it('returns the row from the repository', async () => {
    const { service, repository } = setup();
    repository.findById.mockResolvedValue(row);

    await expect(service.findById(row.id)).resolves.toBe(row);
    expect(repository.findById).toHaveBeenCalledWith(row.id);
  });
});

describe('UsersService.findByEmail', () => {
  it('looks the row up by the trimmed, lowercased email', async () => {
    const { service, repository } = setup();
    repository.findByEmail.mockResolvedValue(row);

    await expect(service.findByEmail(' Camille@Exemple.FR ')).resolves.toBe(
      row,
    );
    expect(repository.findByEmail).toHaveBeenCalledWith('camille@exemple.fr');
  });

  it('returns null when no account has this email', async () => {
    const { service, repository } = setup();
    repository.findByEmail.mockResolvedValue(null);

    await expect(service.findByEmail('inconnu@exemple.fr')).resolves.toBeNull();
  });
});

describe('UsersService.updateProfile', () => {
  const updated: UserRow = { ...row, firstName: 'Camille-Marie' };

  function setupUpdate() {
    const context = setup();
    context.repository.findById.mockResolvedValue(row);
    context.repository.update.mockResolvedValue(updated);
    return context;
  }

  it('updates only the sent fields, without reading the user nor checking the password', async () => {
    const { service, repository, hasher } = setupUpdate();

    await expect(
      service.updateProfile(row.id, {
        firstName: 'Camille-Marie',
        phone: null,
      }),
    ).resolves.toBe(updated);

    expect(repository.update).toHaveBeenCalledWith(row.id, {
      firstName: 'Camille-Marie',
      phone: null,
    });
    expect(repository.findById).not.toHaveBeenCalled();
    expect(hasher.verify).not.toHaveBeenCalled();
  });

  it('passes only the profile fields to the repository', async () => {
    const { service, repository } = setupUpdate();
    const body = {
      lastName: 'Martin',
      id: 'another-id',
      passwordHash: 'injected',
      createdAt: new Date(0),
    } as UpdateMeBody;

    await service.updateProfile(row.id, body);

    expect(repository.update).toHaveBeenCalledWith(row.id, {
      lastName: 'Martin',
    });
  });

  it('returns the user unchanged, without writing, when there is nothing to update', async () => {
    const { service, repository } = setupUpdate();

    await expect(service.updateProfile(row.id, {})).resolves.toBe(row);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('throws 401 UNAUTHORIZED when there is nothing to update and the user no longer exists', async () => {
    const { service, repository } = setupUpdate();
    repository.findById.mockResolvedValue(null);

    await expect(service.updateProfile(row.id, {})).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    });
  });

  it('changes the email after checking the current password, and never stores the password', async () => {
    const { service, repository, hasher } = setupUpdate();
    hasher.verify.mockResolvedValue(true);

    await service.updateProfile(row.id, {
      email: ' Camille.Durand@Exemple.FR ',
      currentPassword: 'motdepasse123',
    });

    expect(hasher.verify).toHaveBeenCalledWith('stored-hash', 'motdepasse123');
    expect(repository.update).toHaveBeenCalledWith(row.id, {
      email: 'camille.durand@exemple.fr',
    });
    expect(hasher.verify.mock.invocationCallOrder[0]).toBeLessThan(
      repository.update.mock.invocationCallOrder[0],
    );
  });

  it('throws 403 WRONG_PASSWORD and changes nothing when the password is wrong', async () => {
    const { service, repository, hasher } = setupUpdate();
    hasher.verify.mockResolvedValue(false);

    const promise = service.updateProfile(row.id, {
      email: 'camille.durand@exemple.fr',
      firstName: 'Camille-Marie',
      currentPassword: 'mauvais123',
    });

    await expect(promise).rejects.toBeInstanceOf(AppError);
    await expect(promise).rejects.toMatchObject({
      status: 403,
      code: 'WRONG_PASSWORD',
    });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('throws 403 WRONG_PASSWORD when the email comes without a password', async () => {
    const { service, repository, hasher } = setupUpdate();

    await expect(
      service.updateProfile(row.id, { email: 'camille.durand@exemple.fr' }),
    ).rejects.toMatchObject({ code: 'WRONG_PASSWORD' });
    expect(hasher.verify).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('throws 409 EMAIL_ALREADY_USED when the email belongs to another account', async () => {
    const { service, repository, hasher } = setupUpdate();
    hasher.verify.mockResolvedValue(true);
    repository.update.mockRejectedValue(
      new Error('Failed query', {
        cause: { code: '23505', constraint_name: 'users_email_unique' },
      }),
    );

    const promise = service.updateProfile(row.id, {
      email: 'pris@exemple.fr',
      currentPassword: 'motdepasse123',
    });

    await expect(promise).rejects.toBeInstanceOf(AppError);
    await expect(promise).rejects.toMatchObject({
      status: 409,
      code: 'EMAIL_ALREADY_USED',
    });
  });

  it('rethrows any other error as is', async () => {
    const { service, repository } = setupUpdate();
    const error = new Error('boom');
    repository.update.mockRejectedValue(error);

    await expect(
      service.updateProfile(row.id, { lastName: 'Martin' }),
    ).rejects.toBe(error);
  });

  it('throws 401 UNAUTHORIZED before checking the password when the user no longer exists', async () => {
    const { service, repository, hasher } = setupUpdate();
    repository.findById.mockResolvedValue(null);

    await expect(
      service.updateProfile(row.id, {
        email: 'camille.durand@exemple.fr',
        currentPassword: 'motdepasse123',
      }),
    ).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
    expect(hasher.verify).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('throws 401 UNAUTHORIZED when the user is deleted during the update', async () => {
    const { service, repository } = setupUpdate();
    repository.update.mockResolvedValue(null);

    await expect(
      service.updateProfile(row.id, { lastName: 'Martin' }),
    ).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
  });
});

describe('UsersService.verifyCredentials', () => {
  it('returns the user when the password matches', async () => {
    const { service, repository, hasher } = setup();
    repository.findByEmail.mockResolvedValue(row);
    hasher.verify.mockResolvedValue(true);

    await expect(
      service.verifyCredentials('CAMILLE@exemple.fr', 'motdepasse123'),
    ).resolves.toBe(row);
    expect(repository.findByEmail).toHaveBeenCalledWith('camille@exemple.fr');
    expect(hasher.verify).toHaveBeenCalledWith('stored-hash', 'motdepasse123');
  });

  it('returns null when the password is wrong', async () => {
    const { service, repository, hasher } = setup();
    repository.findByEmail.mockResolvedValue(row);
    hasher.verify.mockResolvedValue(false);

    await expect(
      service.verifyCredentials('camille@exemple.fr', 'mauvais123'),
    ).resolves.toBeNull();
  });

  it('returns null for an unknown email, after comparing against a dummy hash', async () => {
    const { service, repository, hasher } = setup();
    repository.findByEmail.mockResolvedValue(null);
    hasher.verify.mockResolvedValue(false);

    await expect(
      service.verifyCredentials('inconnu@exemple.fr', 'motdepasse123'),
    ).resolves.toBeNull();
    expect(hasher.verify).toHaveBeenCalledWith('hashed', 'motdepasse123');

    await service.verifyCredentials('autre@exemple.fr', 'motdepasse123');
    expect(hasher.hash).toHaveBeenCalledTimes(1);
    expect(hasher.verify).toHaveBeenCalledTimes(2);
  });
});

describe('UsersService dummy hash', () => {
  it('is computed at module init, then reused for unknown emails', async () => {
    const { service, repository, hasher } = setup();
    repository.findByEmail.mockResolvedValue(null);
    hasher.verify.mockResolvedValue(false);

    await service.onModuleInit();
    expect(hasher.hash).toHaveBeenCalledTimes(1);

    await service.verifyCredentials('inconnu@exemple.fr', 'motdepasse123');
    expect(hasher.hash).toHaveBeenCalledTimes(1);
    expect(hasher.verify).toHaveBeenCalledWith('hashed', 'motdepasse123');
  });

  it('is computed again after a failure instead of caching the error', async () => {
    const { service, repository, hasher } = setup();
    repository.findByEmail.mockResolvedValue(null);
    hasher.verify.mockResolvedValue(false);
    hasher.hash.mockRejectedValueOnce(new Error('pool exhausted'));

    await expect(
      service.verifyCredentials('inconnu@exemple.fr', 'motdepasse123'),
    ).rejects.toThrow('pool exhausted');
    await expect(
      service.verifyCredentials('inconnu@exemple.fr', 'motdepasse123'),
    ).resolves.toBeNull();
    expect(hasher.hash).toHaveBeenCalledTimes(2);
  });
});

describe('UsersService.resetPassword', () => {
  it('stores the hash of the new password, never the plain one', async () => {
    const { service, repository, hasher } = setup();

    await expect(
      service.resetPassword(row.id, 'nouveaumotdepasse456'),
    ).resolves.toBe(true);

    expect(hasher.hash).toHaveBeenCalledWith('nouveaumotdepasse456');
    expect(repository.updatePassword).toHaveBeenCalledWith(row.id, 'hashed');
  });

  it('returns false when the user no longer exists', async () => {
    const { service, repository } = setup();
    repository.updatePassword.mockResolvedValue(false);

    await expect(
      service.resetPassword(row.id, 'nouveaumotdepasse456'),
    ).resolves.toBe(false);
  });
});
