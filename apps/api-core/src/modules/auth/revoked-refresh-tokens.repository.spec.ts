import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import type { Database } from '../../core/database/index.js';
import { RevokedRefreshTokensRepository } from './revoked-refresh-tokens.repository.js';
import { revokedRefreshTokens } from './revoked-refresh-tokens.schema.js';

const JTI = 'c1b2c3d4-0000-4000-8000-000000000003';
const EXPIRES_AT = new Date('2026-11-20T10:00:00Z');
const NOW = new Date('2026-11-13T10:00:00Z');

const dialect = new PgDialect();
const render = (condition: SQL) => dialect.sqlToQuery(condition);

function setup() {
  const stored = new Set<string>();
  const deleteQuery = { where: vi.fn().mockResolvedValue(undefined) };
  const insertQuery = {
    values: vi.fn(),
    onConflictDoNothing: vi.fn(),
    returning: vi.fn(),
  };
  let pending: { jti: string } | undefined;
  insertQuery.values.mockImplementation((values: { jti: string }) => {
    pending = values;
    return insertQuery;
  });
  insertQuery.onConflictDoNothing.mockReturnValue(insertQuery);
  insertQuery.returning.mockImplementation(() => {
    if (!pending || stored.has(pending.jti)) {
      return Promise.resolve([]);
    }
    stored.add(pending.jti);
    return Promise.resolve([{ jti: pending.jti }]);
  });
  const selectQuery = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  };
  selectQuery.from.mockReturnValue(selectQuery);
  selectQuery.where.mockReturnValue(selectQuery);
  selectQuery.limit.mockImplementation(() => {
    const { params } = render(selectQuery.where.mock.calls.at(-1)?.[0] as SQL);
    return Promise.resolve(
      stored.has(params[0] as string) ? [{ jti: params[0] }] : [],
    );
  });
  const db = {
    delete: vi.fn(() => deleteQuery),
    insert: vi.fn(() => insertQuery),
    select: vi.fn(() => selectQuery),
  };
  const repository = new RevokedRefreshTokensRepository(
    db as unknown as Database,
  );
  return { repository, db, deleteQuery, insertQuery, selectQuery };
}

describe('RevokedRefreshTokensRepository', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('revoke', () => {
    it('returns true when the jti is inserted, then false for the same jti', async () => {
      const { repository } = setup();

      await expect(repository.revoke(JTI, EXPIRES_AT)).resolves.toBe(true);
      await expect(repository.revoke(JTI, EXPIRES_AT)).resolves.toBe(false);
    });

    it('inserts the jti and its expiration, ignoring a conflict on jti and returning the inserted row', async () => {
      const { repository, db, insertQuery } = setup();

      await repository.revoke(JTI, EXPIRES_AT);

      expect(db.insert).toHaveBeenCalledWith(revokedRefreshTokens);
      expect(insertQuery.values).toHaveBeenCalledWith({
        jti: JTI,
        expiresAt: EXPIRES_AT,
      });
      expect(insertQuery.onConflictDoNothing).toHaveBeenCalledWith({
        target: revokedRefreshTokens.jti,
      });
      expect(insertQuery.returning).toHaveBeenCalledWith({
        jti: revokedRefreshTokens.jti,
      });
    });

    it('deletes the rows whose expiration has passed before inserting', async () => {
      const { repository, db, deleteQuery } = setup();

      await repository.revoke(JTI, EXPIRES_AT);

      expect(db.delete).toHaveBeenCalledWith(revokedRefreshTokens);
      const { sql, params } = render(deleteQuery.where.mock.calls[0][0] as SQL);
      expect(sql).toBe('"revoked_refresh_tokens"."expires_at" < $1');
      expect(params).toEqual([NOW.toISOString()]);
      expect(db.delete.mock.invocationCallOrder[0]).toBeLessThan(
        db.insert.mock.invocationCallOrder[0],
      );
    });

    it('propagates a database error', async () => {
      const { repository, insertQuery } = setup();
      const error = new Error('connection refused');
      insertQuery.returning.mockRejectedValue(error);

      await expect(repository.revoke(JTI, EXPIRES_AT)).rejects.toBe(error);
    });
  });

  describe('isRevoked', () => {
    it('is false for an unknown jti and true once revoked', async () => {
      const { repository, selectQuery } = setup();

      await expect(repository.isRevoked(JTI)).resolves.toBe(false);
      await repository.revoke(JTI, EXPIRES_AT);
      await expect(repository.isRevoked(JTI)).resolves.toBe(true);

      const { sql } = render(selectQuery.where.mock.calls[0][0] as SQL);
      expect(sql).toBe('"revoked_refresh_tokens"."jti" = $1');
      expect(selectQuery.limit).toHaveBeenCalledWith(1);
    });
  });
});
