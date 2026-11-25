import { Injectable } from '@nestjs/common';
import { and, eq, gt, isNull, lt, or } from 'drizzle-orm';
import {
  type Database,
  InjectDatabase,
  type Transaction,
} from '../../core/database/index.js';
import {
  type NewPasswordResetTokenRow,
  passwordResetTokens,
} from './password-reset-tokens.schema.js';

export type PasswordResetTokenValues = Pick<
  NewPasswordResetTokenRow,
  'userId' | 'tokenHash' | 'expiresAt'
>;

export type ChangePassword = (
  userId: string,
  transaction: Transaction,
) => Promise<boolean>;

@Injectable()
export class PasswordResetTokensRepository {
  constructor(@InjectDatabase() private readonly db: Database) {}

  async replaceForUser(
    values: PasswordResetTokenValues,
    cooldownMs: number,
  ): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const recent = await tx
        .select({ id: passwordResetTokens.id })
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.userId, values.userId),
            gt(
              passwordResetTokens.createdAt,
              new Date(Date.now() - cooldownMs),
            ),
          ),
        )
        .limit(1);
      if (recent.length > 0) {
        return false;
      }
      await tx
        .delete(passwordResetTokens)
        .where(
          or(
            eq(passwordResetTokens.userId, values.userId),
            lt(passwordResetTokens.expiresAt, new Date()),
          ),
        );
      await tx.insert(passwordResetTokens).values(values);
      return true;
    });
  }

  async consume(
    tokenHash: string,
    changePassword: ChangePassword,
  ): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const now = new Date();
      const [row] = await tx
        .update(passwordResetTokens)
        .set({ usedAt: now })
        .where(
          and(
            eq(passwordResetTokens.tokenHash, tokenHash),
            isNull(passwordResetTokens.usedAt),
            gt(passwordResetTokens.expiresAt, now),
          ),
        )
        .returning({ userId: passwordResetTokens.userId });
      return row !== undefined && changePassword(row.userId, tx);
    });
  }
}
