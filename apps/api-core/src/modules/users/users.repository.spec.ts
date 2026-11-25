import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import type { Database } from '../../core/database/index.js';
import { isEmailConflict, UsersRepository } from './users.repository.js';
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
      sql: '"users"."id" = $1',
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

describe('UsersRepository.incrementTokenVersion', () => {
  it('increments token_version in the database and returns the new version', async () => {
    const { repository, db, updateQuery } = setup();
    updateQuery.returning.mockResolvedValue([{ tokenVersion: 3 }]);

    await expect(repository.incrementTokenVersion(row.id)).resolves.toBe(3);

    expect(db.update).toHaveBeenCalledWith(users);
    const [{ tokenVersion }] = updateQuery.set.mock.calls[0] as [
      { tokenVersion: SQL },
    ];
    expect(render(tokenVersion).sql).toBe('"users"."token_version" + 1');
    const [condition] = updateQuery.where.mock.calls[0] as [SQL];
    expect(render(condition)).toMatchObject({
      sql: '"users"."id" = $1',
      params: [row.id],
    });
  });

  it('returns null when no user has this id', async () => {
    const { repository, updateQuery } = setup();
    updateQuery.returning.mockResolvedValue([]);

    await expect(repository.incrementTokenVersion(row.id)).resolves.toBeNull();
  });
});

describe('UsersRepository.updatePassword', () => {
  it('sets the new hash and increments token_version in the same update', async () => {
    const { repository, db, updateQuery } = setup();

    await expect(repository.updatePassword(row.id, 'new-hash')).resolves.toBe(
      row,
    );

    expect(db.update).toHaveBeenCalledOnce();
    const [{ passwordHash, tokenVersion }] = updateQuery.set.mock.calls[0] as [
      { passwordHash: string; tokenVersion: SQL },
    ];
    expect(passwordHash).toBe('new-hash');
    expect(render(tokenVersion).sql).toBe('"users"."token_version" + 1');
    const [condition] = updateQuery.where.mock.calls[0] as [SQL];
    expect(render(condition)).toMatchObject({
      sql: '"users"."id" = $1',
      params: [row.id],
    });
  });

  it('returns null when no user has this id', async () => {
    const { repository, updateQuery } = setup();
    updateQuery.returning.mockResolvedValue([]);

    await expect(
      repository.updatePassword(row.id, 'new-hash'),
    ).resolves.toBeNull();
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
