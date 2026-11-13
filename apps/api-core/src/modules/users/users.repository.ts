import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { type Database, InjectDatabase } from '../../core/database/index.js';
import { type NewUserRow, type UserRow, users } from './users.schema.js';

@Injectable()
export class UsersRepository {
  constructor(@InjectDatabase() private readonly db: Database) {}

  async insert(values: NewUserRow): Promise<UserRow> {
    const [row] = await this.db.insert(users).values(values).returning();
    return row;
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return row ?? null;
  }

  async findById(id: string): Promise<UserRow | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return row ?? null;
  }
}
