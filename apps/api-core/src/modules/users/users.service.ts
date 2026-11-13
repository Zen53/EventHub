import { randomUUID } from 'node:crypto';
import { Injectable, type OnModuleInit } from '@nestjs/common';
import { AppError } from '../../core/errors/app-error.js';
import { PasswordHasher } from './password-hasher.js';
import { UsersRepository } from './users.repository.js';
import { USERS_EMAIL_UNIQUE, type UserRow } from './users.schema.js';

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
}

const UNIQUE_VIOLATION = '23505';

// Drizzle wraps the postgres.js error in a DrizzleQueryError, whose `cause` carries the SQLSTATE code.
function isEmailUniqueViolation(error: unknown): boolean {
  const pgError =
    error instanceof Error && error.cause !== undefined ? error.cause : error;
  if (typeof pgError !== 'object' || pgError === null) return false;
  const { code, constraint_name } = pgError as {
    code?: unknown;
    constraint_name?: unknown;
  };
  return code === UNIQUE_VIOLATION && constraint_name === USERS_EMAIL_UNIQUE;
}

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

@Injectable()
export class UsersService implements OnModuleInit {
  private dummyHash?: Promise<string>;

  constructor(
    private readonly repository: UsersRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  // Computed at startup, so the first unknown-email login is not slower than the others.
  async onModuleInit(): Promise<void> {
    await this.getDummyHash();
  }

  async create(input: CreateUserInput): Promise<UserRow> {
    const passwordHash = await this.hasher.hash(input.password);
    try {
      return await this.repository.insert({
        email: normalizeEmail(input.email),
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone ?? null,
        passwordHash,
      });
    } catch (error) {
      // The unique index decides, so two simultaneous sign-ups with the same email cannot both pass.
      if (isEmailUniqueViolation(error)) {
        throw new AppError(
          409,
          'EMAIL_ALREADY_USED',
          'Cet email est déjà associé à un compte.',
        );
      }
      throw error;
    }
  }

  findById(id: string): Promise<UserRow | null> {
    return this.repository.findById(id);
  }

  /** Returns the user, or null without telling whether the email or the password is wrong. */
  async verifyCredentials(
    email: string,
    password: string,
  ): Promise<UserRow | null> {
    const user = await this.repository.findByEmail(normalizeEmail(email));
    if (!user) {
      // Hash comparison anyway, so the response time does not reveal whether the account exists.
      await this.hasher.verify(await this.getDummyHash(), password);
      return null;
    }
    const valid = await this.hasher.verify(user.passwordHash, password);
    return valid ? user : null;
  }

  private getDummyHash(): Promise<string> {
    // A failed attempt is not cached, so the next call tries again.
    this.dummyHash ??= this.hasher.hash(randomUUID()).catch((error) => {
      this.dummyHash = undefined;
      throw error;
    });
    return this.dummyHash;
  }
}
