import { Injectable } from '@nestjs/common';
import { eq, lt, or } from 'drizzle-orm';
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
}
