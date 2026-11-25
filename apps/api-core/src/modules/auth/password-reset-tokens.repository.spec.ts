import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import type { Database } from '../../core/database/index.js';
import { PasswordResetTokensRepository } from './password-reset-tokens.repository.js';
import { passwordResetTokens } from './password-reset-tokens.schema.js';

const NOW = new Date('2026-11-25T10:00:00Z');
const values = {
  userId: 'a1b2c3d4-0000-4000-8000-000000000002',
  tokenHash: 'a'.repeat(64),
  expiresAt: new Date('2026-11-25T11:00:00Z'),
};

const dialect = new PgDialect();
const render = (condition: SQL) => dialect.sqlToQuery(condition);

function setup() {
  const deleteQuery = { where: vi.fn().mockResolvedValue(undefined) };
  const insertQuery = { values: vi.fn().mockResolvedValue(undefined) };
  const tx = {
    delete: vi.fn(() => deleteQuery),
    insert: vi.fn(() => insertQuery),
  };
  const db = {
    transaction: vi.fn((run: (transaction: typeof tx) => Promise<void>) =>
      run(tx),
    ),
    delete: vi.fn(),
    insert: vi.fn(),
  };
  const repository = new PasswordResetTokensRepository(
    db as unknown as Database,
  );
  return { repository, db, tx, deleteQuery, insertQuery };
}

describe('PasswordResetTokensRepository.replaceForUser', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deletes the previous tokens of the user and the expired ones', async () => {
    const { repository, tx, deleteQuery } = setup();

    await repository.replaceForUser(values);

    expect(tx.delete).toHaveBeenCalledWith(passwordResetTokens);
    const { sql, params } = render(deleteQuery.where.mock.calls[0][0] as SQL);
    expect(sql).toBe(
      '("password_reset_tokens"."user_id" = $1 or "password_reset_tokens"."expires_at" < $2)',
    );
    expect(params).toEqual([values.userId, NOW.toISOString()]);
  });

  it('inserts the hashed token after the deletion', async () => {
    const { repository, tx, insertQuery } = setup();

    await repository.replaceForUser(values);

    expect(tx.insert).toHaveBeenCalledWith(passwordResetTokens);
    expect(insertQuery.values).toHaveBeenCalledWith(values);
    expect(tx.delete.mock.invocationCallOrder[0]).toBeLessThan(
      tx.insert.mock.invocationCallOrder[0],
    );
  });

  it('runs both statements in one transaction', async () => {
    const { repository, db } = setup();

    await repository.replaceForUser(values);

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(db.delete).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('inserts nothing when the deletion fails', async () => {
    const { repository, tx, deleteQuery } = setup();
    const error = new Error('connection lost');
    deleteQuery.where.mockRejectedValue(error);

    await expect(repository.replaceForUser(values)).rejects.toBe(error);
    expect(tx.insert).not.toHaveBeenCalled();
  });
});
