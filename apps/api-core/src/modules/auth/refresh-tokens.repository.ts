import { Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { type Database, InjectDatabase } from '../../core/database/index.js';
import {
  type NewRefreshTokenRow,
  type RefreshTokenRow,
  refreshTokens,
} from './refresh-tokens.schema.js';

@Injectable()
export class RefreshTokensRepository {
  constructor(@InjectDatabase() private readonly db: Database) {}

  async insert(values: NewRefreshTokenRow): Promise<RefreshTokenRow> {
    const [row] = await this.db
      .insert(refreshTokens)
      .values(values)
      .returning();
    return row;
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRow | null> {
    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);
    return row ?? null;
  }

  async revoke(id: string, revokedAt: Date = new Date()): Promise<boolean> {
    const rows = await this.db
      .update(refreshTokens)
      .set({ revokedAt })
      .where(and(eq(refreshTokens.id, id), isNull(refreshTokens.revokedAt)))
      .returning({ id: refreshTokens.id });
    return rows.length > 0;
  }
}
