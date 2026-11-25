import { Injectable } from '@nestjs/common';
import { and, eq, gt, isNull, lt, or } from 'drizzle-orm';
import { type Database, InjectDatabase } from '../../core/database/index.js';
import {
  type NewPasswordResetTokenRow,
  passwordResetTokens,
} from './password-reset-tokens.schema.js';

export type PasswordResetTokenValues = Pick<
  NewPasswordResetTokenRow,
  'userId' | 'tokenHash' | 'expiresAt'
>;

@Injectable()
export class PasswordResetTokensRepository {
  constructor(@InjectDatabase() private readonly db: Database) {}

  async replaceForUser(values: PasswordResetTokenValues): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(passwordResetTokens)
        .where(
          or(
            eq(passwordResetTokens.userId, values.userId),
            lt(passwordResetTokens.expiresAt, new Date()),
          ),
        );
      await tx.insert(passwordResetTokens).values(values);
    });
  }

  async consume(tokenHash: string): Promise<string | null> {
    const now = new Date();
    const [row] = await this.db
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
    return row?.userId ?? null;
  }
}
