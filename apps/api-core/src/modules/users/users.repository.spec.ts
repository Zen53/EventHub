import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import type { Database, Transaction } from '../../core/database/index.js';
import {
  isEmailConflict,
  revocationInstant,
  UsersRepository,
} from './users.repository.js';
import { type UserRow, users } from './users.schema.js';

const dialect = new PgDialect();
const render = (condition: SQL) => dialect.sqlToQuery(condition);

const row = { id: 'a1b2c3d4-0000-4000-8000-000000000002' } as UserRow;

function setup() {
  const updateQuery = {
    set: vi.fn(),
    where: vi.fn(),
    returning: vi.fn().mockResolvedValue([row]),
  };
  updateQuery.set.mockReturnValue(updateQuery);
  updateQuery.where.mockReturnValue(updateQuery);
  const db = { update: vi.fn(() => updateQuery) };
  const repository = new UsersRepository(db as unknown as Database);
  return { repository, db, updateQuery };
}

describe('UsersRepository.update', () => {
  it('sets only the given changes on the user and returns the updated row', async () => {
    const { repository, db, updateQuery } = setup();

    await expect(
      repository.update(row.id, { firstName: 'Camille', phone: null }),
    ).resolves.toBe(row);

    expect(db.update).toHaveBeenCalledWith(users);
    expect(updateQuery.set).toHaveBeenCalledWith({
      firstName: 'Camille',
      phone: null,
    });
    const [condition] = updateQuery.where.mock.calls[0] as [SQL];
    expect(render(condition)).toMatchObject({
      sql: '("users"."id" = $1 and "users"."deleted_at" is null)',
      params: [row.id],
    });
  });

  it('returns null when no user has this id', async () => {
    const { repository, updateQuery } = setup();
    updateQuery.returning.mockResolvedValue([]);

    await expect(
      repository.update(row.id, { lastName: 'Durand' }),
    ).resolves.toBeNull();
  });
});

describe('UsersRepository.updatePassword', () => {
  const NOW = new Date('2026-11-25T10:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores the new hash and revokes the tokens issued so far, in one statement', async () => {
    const { repository, db, updateQuery } = setup();
    updateQuery.returning.mockResolvedValue([{ id: row.id }]);

    await expect(repository.updatePassword(row.id, 'new-hash')).resolves.toBe(
      true,
    );

    expect(db.update).toHaveBeenCalledTimes(1);
    expect(updateQuery.set).toHaveBeenCalledWith({
      passwordHash: 'new-hash',
      tokensRevokedAt: NOW,
    });
    const [condition] = updateQuery.where.mock.calls[0] as [SQL];
    expect(render(condition)).toMatchObject({
      sql: '("users"."id" = $1 and "users"."deleted_at" is null)',
      params: [row.id],
    });
  });

  it('rounds the revocation down to the second, so a token issued right after stays valid', async () => {
    vi.setSystemTime(new Date('2026-11-25T10:00:00.750Z'));
    const { repository, updateQuery } = setup();

    await repository.updatePassword(row.id, 'new-hash');

    expect(updateQuery.set).toHaveBeenCalledWith({
      passwordHash: 'new-hash',
      tokensRevokedAt: new Date('2026-11-25T10:00:00.000Z'),
    });
  });

  it('returns false when no user has this id', async () => {
    const { repository, updateQuery } = setup();
    updateQuery.returning.mockResolvedValue([]);

    await expect(repository.updatePassword(row.id, 'new-hash')).resolves.toBe(
      false,
    );
  });

  it('runs in the given transaction instead of the database', async () => {
    const { repository, db } = setup();
    const transaction = setup();
    transaction.updateQuery.returning.mockResolvedValue([{ id: row.id }]);

    await expect(
      repository.updatePassword(
        row.id,
        'new-hash',
        transaction.db as unknown as Transaction,
      ),
    ).resolves.toBe(true);

    expect(transaction.db.update).toHaveBeenCalledWith(users);
    expect(db.update).not.toHaveBeenCalled();
  });
});

describe('isEmailConflict', () => {
  const emailViolation = {
    code: '23505',
    constraint_name: 'users_email_unique',
  };

  it('recognizes the email unique violation wrapped by Drizzle', () => {
    expect(
      isEmailConflict(new Error('Failed query', { cause: emailViolation })),
    ).toBe(true);
  });

  it('recognizes the raw Postgres error', () => {
    expect(isEmailConflict(Object.assign(new Error(), emailViolation))).toBe(
      true,
    );
  });

  it.each([
    ['another unique constraint', { code: '23505', constraint_name: 'other' }],
    [
      'another error code',
      { code: '23502', constraint_name: 'users_email_unique' },
    ],
    ['an error without code', {}],
  ])('ignores %s', (_label, cause) => {
    expect(isEmailConflict(new Error('Failed query', { cause }))).toBe(false);
  });

  it.each([new Error('boom'), 'boom', null, undefined])(
    'ignores %j',
    (error) => {
      expect(isEmailConflict(error)).toBe(false);
    },
  );
});

describe('revocationInstant', () => {
  it('rounds down to the second, like the iat of the tokens', () => {
    expect(revocationInstant(Date.parse('2026-11-25T10:00:00.999Z'))).toEqual(
      new Date('2026-11-25T10:00:00.000Z'),
    );
  });
});

describe('UsersRepository reads ignore deleted accounts (EV-81)', () => {
  function setupSelect(rows: UserRow[] = [row]) {
    const selectQuery = {
      from: vi.fn(),
      where: vi.fn(),
      limit: vi.fn().mockResolvedValue(rows),
    };
    selectQuery.from.mockReturnValue(selectQuery);
    selectQuery.where.mockReturnValue(selectQuery);
    const db = { select: vi.fn(() => selectQuery) };
    const repository = new UsersRepository(db as unknown as Database);
    return { repository, selectQuery };
  }

  it('finds a user by id only when the account is not deleted, so its tokens are refused', async () => {
    const { repository, selectQuery } = setupSelect();

    await expect(repository.findById(row.id)).resolves.toBe(row);

    const [condition] = selectQuery.where.mock.calls[0] as [SQL];
    expect(render(condition)).toMatchObject({
      sql: '("users"."id" = $1 and "users"."deleted_at" is null)',
      params: [row.id],
    });
  });

  it('finds a user by email only when the account is not deleted, so it cannot log in', async () => {
    const { repository, selectQuery } = setupSelect([]);

    await expect(
      repository.findByEmail('camille@exemple.fr'),
    ).resolves.toBeNull();

    const [condition] = selectQuery.where.mock.calls[0] as [SQL];
    expect(render(condition)).toMatchObject({
      sql: '("users"."email" = $1 and "users"."deleted_at" is null)',
      params: ['camille@exemple.fr'],
    });
  });
});

describe('UsersRepository.revokeTokens (EV-95)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-25T10:00:00.400Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('revokes every token issued before the current second, for an active account', async () => {
    const { repository, updateQuery } = setup();
    updateQuery.returning.mockResolvedValue([{ id: row.id }]);

    await expect(repository.revokeTokens(row.id)).resolves.toBe(true);

    expect(updateQuery.set).toHaveBeenCalledWith({
      tokensRevokedAt: new Date('2026-11-25T10:00:00.000Z'),
    });
    const [condition] = updateQuery.where.mock.calls[0] as [SQL];
    expect(render(condition)).toMatchObject({
      sql: '("users"."id" = $1 and "users"."deleted_at" is null)',
      params: [row.id],
    });
  });

  it('returns false for an unknown or deleted account', async () => {
    const { repository, updateQuery } = setup();
    updateQuery.returning.mockResolvedValue([]);

    await expect(repository.revokeTokens(row.id)).resolves.toBe(false);
  });
});

describe('UsersRepository.anonymize (EV-83)', () => {
  const NOW = new Date('2026-11-25T10:00:00.400Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('anonymizes the active account and revokes its tokens in one update', async () => {
    const { repository, db, updateQuery } = setup();
    updateQuery.returning.mockResolvedValue([{ id: row.id }]);

    await expect(repository.anonymize(row.id)).resolves.toBe(true);

    expect(db.update).toHaveBeenCalledOnce();
    expect(updateQuery.set).toHaveBeenCalledWith({
      email: `deleted-${row.id}@eventhub.invalid`,
      firstName: 'Utilisateur',
      lastName: 'supprimé',
      phone: null,
      passwordHash: '',
      tokensRevokedAt: new Date('2026-11-25T10:00:00.000Z'),
      deletedAt: NOW,
    });
    const [condition] = updateQuery.where.mock.calls[0] as [SQL];
    expect(render(condition)).toMatchObject({
      sql: '("users"."id" = $1 and "users"."deleted_at" is null)',
      params: [row.id],
    });
  });

  it('returns false for an unknown or already deleted account', async () => {
    const { repository, updateQuery } = setup();
    updateQuery.returning.mockResolvedValue([]);

    await expect(repository.anonymize(row.id)).resolves.toBe(false);
  });
});
