import { index, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

export const revokedRefreshTokens = pgTable(
  'revoked_refresh_tokens',
  {
    jti: uuid('jti').primaryKey(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('revoked_refresh_tokens_expires_at_idx').on(table.expiresAt),
  ],
);
