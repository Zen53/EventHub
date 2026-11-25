import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { type Database, InjectDatabase } from '../../core/database/index.js';
import { type NewUserRow, type UserRow, users } from './users.schema.js';

export type UserProfileChanges = Partial<
  Pick<NewUserRow, 'email' | 'firstName' | 'lastName' | 'phone'>
>;

const UNIQUE_VIOLATION = '23505';
const EMAIL_UNIQUE_CONSTRAINT = 'users_email_unique';

/**
 * Vrai quand l'erreur vient de la contrainte d'unicité sur `users.email`.
 * Drizzle enveloppe l'erreur de Postgres dans `cause`.
 */
export const isEmailConflict = (error: unknown): boolean => {
  const postgresError =
    error instanceof Error && error.cause !== undefined ? error.cause : error;
  if (typeof postgresError !== 'object' || postgresError === null) {
    return false;
  }
  const { code, constraint_name } = postgresError as Record<string, unknown>;
  return (
    code === UNIQUE_VIOLATION && constraint_name === EMAIL_UNIQUE_CONSTRAINT
  );
};

@Injectable()
export class UsersRepository {
  constructor(@InjectDatabase() private readonly db: Database) {}

  async insert(values: NewUserRow): Promise<UserRow | null> {
    const [row] = await this.db
      .insert(users)
      .values(values)
      .onConflictDoNothing({ target: users.email })
      .returning();
    return row ?? null;
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

  async update(
    id: string,
    changes: UserProfileChanges,
  ): Promise<UserRow | null> {
    const [row] = await this.db
      .update(users)
      .set(changes)
      .where(eq(users.id, id))
      .returning();
    return row ?? null;
  }

  /** Invalide toutes les sessions de l'utilisateur, et renvoie la nouvelle version. */
  async incrementTokenVersion(id: string): Promise<number | null> {
    const [row] = await this.db
      .update(users)
      .set({ tokenVersion: nextTokenVersion })
      .where(eq(users.id, id))
      .returning({ tokenVersion: users.tokenVersion });
    return row?.tokenVersion ?? null;
  }

  /** Change le mot de passe et invalide toutes les sessions, en une seule écriture. */
  async updatePassword(
    id: string,
    passwordHash: string,
  ): Promise<UserRow | null> {
    const [row] = await this.db
      .update(users)
      .set({ passwordHash, tokenVersion: nextTokenVersion })
      .where(eq(users.id, id))
      .returning();
    return row ?? null;
  }
}

// Incrément atomique côté base : deux révocations simultanées ne se perdent pas.
const nextTokenVersion = sql`${users.tokenVersion} + 1`;
