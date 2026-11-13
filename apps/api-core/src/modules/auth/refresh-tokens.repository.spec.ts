import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import type { Database } from '../../core/database/index.js';
import { RefreshTokensRepository } from './refresh-tokens.repository.js';

const row = {
  id: 'b1b2c3d4-0000-4000-8000-000000000001',
  userId: 'a1b2c3d4-0000-4000-8000-000000000002',
  tokenHash: 'a'.repeat(64),
  expiresAt: new Date('2026-11-20T10:00:00Z'),
  revokedAt: null,
  createdAt: new Date('2026-11-13T10:00:00Z'),
};

const dialect = new PgDialect();
const render = (condition: SQL) => dialect.sqlToQuery(condition);

function chain(result: unknown) {
  const query = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    values: vi.fn(),
    set: vi.fn(),
    returning: vi.fn(),
  };
  for (const step of Object.values(query)) step.mockReturnValue(query);
  query.limit.mockResolvedValue(result);
  query.returning.mockResolvedValue(result);
  return query;
}

function setup(result: unknown) {
  const query = chain(result);
  const db = {
    select: vi.fn(() => query),
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
  };
  const repository = new RefreshTokensRepository(db as unknown as Database);
  return { repository, db, query };
}

describe('RefreshTokensRepository', () => {
  it('inserts the values and returns the stored row', async () => {
    const { repository, query } = setup([row]);
    const values = {
      userId: row.userId,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
    };

    await expect(repository.insert(values)).resolves.toBe(row);
    expect(query.values).toHaveBeenCalledWith(values);
  });

  it('throws when the insert returns no row', async () => {
    const { repository } = setup([]);

    await expect(
      repository.insert({
        userId: row.userId,
        tokenHash: row.tokenHash,
        expiresAt: row.expiresAt,
      }),
    ).rejects.toThrow();
  });

  it('finds a token by its hash', async () => {
    const { repository, query } = setup([row]);

    await expect(repository.findByHash(row.tokenHash)).resolves.toBe(row);
    const { sql, params } = render(query.where.mock.calls[0][0] as SQL);
    expect(sql).toBe('"refresh_tokens"."token_hash" = $1');
    expect(params).toEqual([row.tokenHash]);
    expect(query.limit).toHaveBeenCalledWith(1);
  });

  it('returns null for an unknown hash', async () => {
    const { repository } = setup([]);

    await expect(repository.findByHash('unknown')).resolves.toBeNull();
  });

  it('revokes only a token that is not revoked yet', async () => {
    const { repository, query } = setup([{ id: row.id }]);
    const revokedAt = new Date('2026-11-14T10:00:00Z');

    await expect(repository.revoke(row.id, revokedAt)).resolves.toBe(true);
    expect(query.set).toHaveBeenCalledWith({ revokedAt });
    const { sql, params } = render(query.where.mock.calls[0][0] as SQL);
    expect(sql).toBe(
      '("refresh_tokens"."id" = $1 and "refresh_tokens"."revoked_at" is null)',
    );
    expect(params).toEqual([row.id]);
  });

  it('returns false when the token was already revoked or does not exist', async () => {
    const { repository } = setup([]);

    await expect(repository.revoke(row.id)).resolves.toBe(false);
  });
});
