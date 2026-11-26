import { Injectable } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
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
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async findById(id: string): Promise<UserRow | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(activeUser(id))
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
      .where(activeUser(id))
      .returning();
    return row ?? null;
  }

  /** Invalide toutes les sessions de l'utilisateur, et renvoie la nouvelle version. */
  async incrementTokenVersion(id: string): Promise<number | null> {
    const [row] = await this.db
      .update(users)
      .set({ tokenVersion: nextTokenVersion })
      .where(activeUser(id))
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
      .where(activeUser(id))
      .returning();
    return row ?? null;
  }

  /**
   * Anonymise le compte (EV-83) au lieu d'effacer la ligne, pour que ses
   * événements passés gardent un organisateur valide. L'email d'origine est
   * libéré, le mot de passe effacé, et toutes les sessions sont invalidées.
   * Renvoie false si le compte n'existe pas ou est déjà supprimé.
   */
  async anonymize(id: string): Promise<boolean> {
    const rows = await this.db
      .update(users)
      .set({
        email: anonymizedEmail(id),
        firstName: ANONYMOUS_FIRST_NAME,
        lastName: ANONYMOUS_LAST_NAME,
        phone: null,
        passwordHash: ERASED_PASSWORD_HASH,
        tokenVersion: nextTokenVersion,
        deletedAt: sql`now()`,
      })
      .where(activeUser(id))
      .returning({ id: users.id });
    return rows.length > 0;
  }
}

/** Unique par compte : libère l'email d'origine sans violer la contrainte d'unicité. */
export const anonymizedEmail = (id: string) => `deleted-${id}@eventhub.invalid`;
export const ANONYMOUS_FIRST_NAME = 'Utilisateur';
export const ANONYMOUS_LAST_NAME = 'supprimé';
/** Aucun mot de passe ne correspond à un hash vide : argon2 le refuse. */
export const ERASED_PASSWORD_HASH = '';

// Un compte supprimé est invisible : ni lecture, ni écriture, ni connexion (EV-81).
const activeUser = (id: string) =>
  and(eq(users.id, id), isNull(users.deletedAt));

// Incrément atomique côté base : deux révocations simultanées ne se perdent pas.
const nextTokenVersion = sql`${users.tokenVersion} + 1`;
