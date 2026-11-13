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
