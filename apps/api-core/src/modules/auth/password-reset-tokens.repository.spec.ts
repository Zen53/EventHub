import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import type { Database, Transaction } from '../../core/database/index.js';
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

const COOLDOWN_MS = 60 * 1000;

function setup(recent: { id: string }[] = []) {
  const selectQuery = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn().mockResolvedValue(recent),
  };
  selectQuery.from.mockReturnValue(selectQuery);
  selectQuery.where.mockReturnValue(selectQuery);
  const deleteQuery = { where: vi.fn().mockResolvedValue(undefined) };
  const insertQuery = { values: vi.fn().mockResolvedValue(undefined) };
  const tx = {
    select: vi.fn(() => selectQuery),
    delete: vi.fn(() => deleteQuery),
    insert: vi.fn(() => insertQuery),
  };
  const db = {
    transaction: vi.fn((run: (transaction: typeof tx) => Promise<boolean>) =>
      run(tx),
    ),
    select: vi.fn(),
    delete: vi.fn(),
    insert: vi.fn(),
  };
  const repository = new PasswordResetTokensRepository(
    db as unknown as Database,
  );
  return { repository, db, tx, selectQuery, deleteQuery, insertQuery };
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

    await expect(repository.replaceForUser(values, COOLDOWN_MS)).resolves.toBe(
      true,
    );

    expect(tx.delete).toHaveBeenCalledWith(passwordResetTokens);
    const { sql, params } = render(deleteQuery.where.mock.calls[0][0] as SQL);
    expect(sql).toBe(
      '("password_reset_tokens"."user_id" = $1 or "password_reset_tokens"."expires_at" < $2)',
    );
    expect(params).toEqual([values.userId, NOW.toISOString()]);
  });

  it('inserts the hashed token after the deletion', async () => {
    const { repository, tx, insertQuery } = setup();

    await repository.replaceForUser(values, COOLDOWN_MS);

    expect(tx.insert).toHaveBeenCalledWith(passwordResetTokens);
    expect(insertQuery.values).toHaveBeenCalledWith(values);
    expect(tx.delete.mock.invocationCallOrder[0]).toBeLessThan(
      tx.insert.mock.invocationCallOrder[0],
    );
  });

  it('looks for a token of the user created during the cooldown', async () => {
    const { repository, tx, selectQuery } = setup();

    await repository.replaceForUser(values, COOLDOWN_MS);

    expect(selectQuery.from).toHaveBeenCalledWith(passwordResetTokens);
    const { sql, params } = render(selectQuery.where.mock.calls[0][0] as SQL);
    expect(sql).toBe(
      '("password_reset_tokens"."user_id" = $1 and "password_reset_tokens"."created_at" > $2)',
    );
    expect(params).toEqual([values.userId, '2026-11-25T09:59:00.000Z']);
    expect(tx.select.mock.invocationCallOrder[0]).toBeLessThan(
      tx.delete.mock.invocationCallOrder[0],
    );
  });

  it('keeps the current token and returns false during the cooldown', async () => {
    const { repository, tx } = setup([{ id: 'recent-token' }]);

    await expect(repository.replaceForUser(values, COOLDOWN_MS)).resolves.toBe(
      false,
    );

    expect(tx.delete).not.toHaveBeenCalled();
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it('runs every statement in one transaction', async () => {
    const { repository, db } = setup();

    await repository.replaceForUser(values, COOLDOWN_MS);

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(db.select).not.toHaveBeenCalled();
    expect(db.delete).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('inserts nothing when the deletion fails', async () => {
    const { repository, tx, deleteQuery } = setup();
    const error = new Error('connection lost');
    deleteQuery.where.mockRejectedValue(error);

    await expect(repository.replaceForUser(values, COOLDOWN_MS)).rejects.toBe(
      error,
    );
    expect(tx.insert).not.toHaveBeenCalled();
  });
});

describe('PasswordResetTokensRepository.consume', () => {
  const tokenHash = 'b'.repeat(64);

  function setupConsume(rows: { userId: string }[]) {
    const updateQuery = {
      set: vi.fn(),
      where: vi.fn(),
      returning: vi.fn().mockResolvedValue(rows),
    };
    updateQuery.set.mockReturnValue(updateQuery);
    updateQuery.where.mockReturnValue(updateQuery);
    const tx = { update: vi.fn(() => updateQuery) };
    const db = {
      transaction: vi.fn((run: (transaction: typeof tx) => Promise<boolean>) =>
        run(tx),
      ),
      update: vi.fn(),
    };
    const changePassword = vi.fn().mockResolvedValue(true);
    const repository = new PasswordResetTokensRepository(
      db as unknown as Database,
    );
    return { repository, db, tx, updateQuery, changePassword };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks as used the token that is neither used nor expired, in one statement', async () => {
    const { repository, tx, updateQuery, changePassword } = setupConsume([
      { userId: values.userId },
    ]);

    await expect(repository.consume(tokenHash, changePassword)).resolves.toBe(
      true,
    );

    expect(tx.update).toHaveBeenCalledTimes(1);
    expect(tx.update).toHaveBeenCalledWith(passwordResetTokens);
    expect(updateQuery.set).toHaveBeenCalledWith({ usedAt: NOW });
    const { sql, params } = render(updateQuery.where.mock.calls[0][0] as SQL);
    expect(sql).toBe(
      '("password_reset_tokens"."token_hash" = $1 and "password_reset_tokens"."used_at" is null and "password_reset_tokens"."expires_at" > $2)',
    );
    expect(params).toEqual([tokenHash, NOW.toISOString()]);
  });

  it('changes the password of the token user in the same transaction', async () => {
    const { repository, db, tx, changePassword } = setupConsume([
      { userId: values.userId },
    ]);

    await repository.consume(tokenHash, changePassword);

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(db.update).not.toHaveBeenCalled();
    expect(changePassword).toHaveBeenCalledWith(
      values.userId,
      tx as unknown as Transaction,
    );
    expect(tx.update.mock.invocationCallOrder[0]).toBeLessThan(
      changePassword.mock.invocationCallOrder[0],
    );
  });

  it('returns false without changing any password when no token matches', async () => {
    const { repository, changePassword } = setupConsume([]);

    await expect(repository.consume(tokenHash, changePassword)).resolves.toBe(
      false,
    );
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('returns false when the password of the user could not be changed', async () => {
    const { repository, changePassword } = setupConsume([
      { userId: values.userId },
    ]);
    changePassword.mockResolvedValue(false);

    await expect(repository.consume(tokenHash, changePassword)).resolves.toBe(
      false,
    );
  });

  it('fails the transaction, which leaves the token usable, when the password update fails', async () => {
    const { repository, db, changePassword } = setupConsume([
      { userId: values.userId },
    ]);
    const error = new Error('connection lost');
    changePassword.mockRejectedValue(error);

    await expect(repository.consume(tokenHash, changePassword)).rejects.toBe(
      error,
    );
    await expect(db.transaction.mock.results[0].value).rejects.toBe(error);
  });
});
