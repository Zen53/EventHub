import type { UpdateMeBody } from '@eventhub/schemas';
import type { Transaction } from '../../core/database/index.js';
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
  tokensRevokedAt: null,
  deletedAt: null,
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
    revokeTokens: vi.fn().mockResolvedValue(true),
    anonymize: vi.fn().mockResolvedValue(true),
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

describe('UsersService.hashPassword', () => {
  it('hashes the password with the password hasher', async () => {
    const { service, hasher } = setup();

    await expect(service.hashPassword('nouveaumotdepasse456')).resolves.toBe(
      'hashed',
    );
    expect(hasher.hash).toHaveBeenCalledWith('nouveaumotdepasse456');
  });
});

describe('UsersService.setPassword', () => {
  const transaction = {} as Transaction;

  it('stores the given hash in the given transaction, without hashing again', async () => {
    const { service, repository, hasher } = setup();

    await expect(
      service.setPassword(row.id, 'new-hash', transaction),
    ).resolves.toBe(true);

    expect(repository.updatePassword).toHaveBeenCalledWith(
      row.id,
      'new-hash',
      transaction,
    );
    expect(hasher.hash).not.toHaveBeenCalled();
  });

  it('returns false when the user no longer exists', async () => {
    const { service, repository } = setup();
    repository.updatePassword.mockResolvedValue(false);

    await expect(
      service.setPassword(row.id, 'new-hash', transaction),
    ).resolves.toBe(false);
  });
});

describe('UsersService.isRevoked', () => {
  const revokedAt = new Date('2026-11-25T10:00:00Z');

  it('is false when the tokens of the user were never revoked', async () => {
    const { service, repository } = setup();
    repository.findById.mockResolvedValue(row);

    await expect(service.isRevoked(row.id, revokedAt)).resolves.toBe(false);
    expect(repository.findById).toHaveBeenCalledWith(row.id);
  });

  it('is true for a token issued before the revocation', async () => {
    const { service, repository } = setup();
    repository.findById.mockResolvedValue({
      ...row,
      tokensRevokedAt: revokedAt,
    });

    await expect(
      service.isRevoked(row.id, new Date('2026-11-25T09:59:59Z')),
    ).resolves.toBe(true);
  });

  it.each(['2026-11-25T10:00:00Z', '2026-11-25T10:00:01Z'])(
    'is false for a token issued at %s, not before the revocation',
    async (issuedAt) => {
      const { service, repository } = setup();
      repository.findById.mockResolvedValue({
        ...row,
        tokensRevokedAt: revokedAt,
      });

      await expect(service.isRevoked(row.id, new Date(issuedAt))).resolves.toBe(
        false,
      );
    },
  );

  it('is true when the user no longer exists', async () => {
    const { service, repository } = setup();
    repository.findById.mockResolvedValue(null);

    await expect(service.isRevoked(row.id, revokedAt)).resolves.toBe(true);
  });
});

describe('UsersService.changePassword', () => {
  const body = {
    currentPassword: 'motdepasse123',
    newPassword: 'nouveaumotdepasse456',
  };

  function setupChange() {
    const context = setup();
    context.repository.findById.mockResolvedValue(row);
    context.hasher.verify.mockResolvedValue(true);
    return context;
  }

  it('checks the current password, then stores the hash of the new one and revokes the tokens', async () => {
    const { service, repository, hasher } = setupChange();

    await expect(service.changePassword(row.id, body)).resolves.toBeUndefined();

    expect(hasher.verify).toHaveBeenCalledWith('stored-hash', 'motdepasse123');
    expect(hasher.hash).toHaveBeenCalledWith('nouveaumotdepasse456');
    expect(repository.updatePassword).toHaveBeenCalledWith(row.id, 'hashed');
    expect(hasher.verify.mock.invocationCallOrder[0]).toBeLessThan(
      repository.updatePassword.mock.invocationCallOrder[0],
    );
  });

  it('throws 403 WRONG_PASSWORD and changes nothing when the current password is wrong', async () => {
    const { service, repository, hasher } = setupChange();
    hasher.verify.mockResolvedValue(false);

    const promise = service.changePassword(row.id, {
      ...body,
      currentPassword: 'mauvais123',
    });

    await expect(promise).rejects.toBeInstanceOf(AppError);
    await expect(promise).rejects.toMatchObject({
      status: 403,
      code: 'WRONG_PASSWORD',
    });
    expect(hasher.hash).not.toHaveBeenCalled();
    expect(repository.updatePassword).not.toHaveBeenCalled();
  });

  it('throws 401 UNAUTHORIZED before checking the password when the account no longer exists', async () => {
    const { service, repository, hasher } = setupChange();
    repository.findById.mockResolvedValue(null);

    await expect(service.changePassword(row.id, body)).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    });
    expect(hasher.verify).not.toHaveBeenCalled();
    expect(repository.updatePassword).not.toHaveBeenCalled();
  });

  it('throws 401 UNAUTHORIZED when the account disappears during the change', async () => {
    const { service, repository } = setupChange();
    repository.updatePassword.mockResolvedValue(false);

    await expect(service.changePassword(row.id, body)).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    });
  });
});

describe('UsersService.revokeAllSessions', () => {
  it('revokes every token of the user', async () => {
    const { service, repository } = setup();

    await expect(service.revokeAllSessions(row.id)).resolves.toBe(true);
    expect(repository.revokeTokens).toHaveBeenCalledWith(row.id);
  });

  it('returns false for an unknown or deleted account', async () => {
    const { service, repository } = setup();
    repository.revokeTokens.mockResolvedValue(false);

    await expect(service.revokeAllSessions(row.id)).resolves.toBe(false);
  });
});

describe('UsersService.verifyPassword', () => {
  it('resolves when the password matches', async () => {
    const { service, repository, hasher } = setup();
    repository.findById.mockResolvedValue(row);
    hasher.verify.mockResolvedValue(true);

    await expect(
      service.verifyPassword(row.id, 'motdepasse123'),
    ).resolves.toBeUndefined();
  });

  it('throws 403 WRONG_PASSWORD when the password is wrong', async () => {
    const { service, repository, hasher } = setup();
    repository.findById.mockResolvedValue(row);
    hasher.verify.mockResolvedValue(false);

    await expect(
      service.verifyPassword(row.id, 'mauvais123'),
    ).rejects.toMatchObject({ status: 403, code: 'WRONG_PASSWORD' });
  });
});

describe('UsersService.anonymize', () => {
  it('anonymizes the account', async () => {
    const { service, repository } = setup();

    await expect(service.anonymize(row.id)).resolves.toBeUndefined();
    expect(repository.anonymize).toHaveBeenCalledWith(row.id);
  });

  it('throws 401 UNAUTHORIZED when the account no longer exists', async () => {
    const { service, repository } = setup();
    repository.anonymize.mockResolvedValue(false);

    await expect(service.anonymize(row.id)).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    });
  });
});
