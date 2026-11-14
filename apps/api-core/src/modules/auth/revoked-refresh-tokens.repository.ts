import { Injectable } from '@nestjs/common';
import { eq, lt } from 'drizzle-orm';
import { type Database, InjectDatabase } from '../../core/database/index.js';
import { revokedRefreshTokens } from './revoked-refresh-tokens.schema.js';

export const REVOKED_PURGE_GRACE_MS = 60 * 60 * 1000;

@Injectable()
export class RevokedRefreshTokensRepository {
  constructor(@InjectDatabase() private readonly db: Database) {}

  async revoke(jti: string, expiresAt: Date): Promise<boolean> {
    await this.db
      .delete(revokedRefreshTokens)
      .where(
        lt(
          revokedRefreshTokens.expiresAt,
          new Date(Date.now() - REVOKED_PURGE_GRACE_MS),
        ),
      );
    const inserted = await this.db
      .insert(revokedRefreshTokens)
      .values({ jti, expiresAt })
      .onConflictDoNothing({ target: revokedRefreshTokens.jti })
      .returning({ jti: revokedRefreshTokens.jti });
    return inserted.length > 0;
  }

  async isRevoked(jti: string): Promise<boolean> {
    const rows = await this.db
      .select({ jti: revokedRefreshTokens.jti })
      .from(revokedRefreshTokens)
      .where(eq(revokedRefreshTokens.jti, jti))
      .limit(1);
    return rows.length > 0;
  }
}
