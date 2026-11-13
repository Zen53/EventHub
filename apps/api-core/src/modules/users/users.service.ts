import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AppError } from '../../core/errors/app-error.js';
import { PasswordHasher } from './password-hasher.js';
import { UsersRepository } from './users.repository.js';
import type { UserRow } from './users.schema.js';

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
}

const UNIQUE_VIOLATION = '23505';

// Drizzle wraps the postgres.js error in a DrizzleQueryError, whose `cause` carries the SQLSTATE code.
function isUniqueViolation(error: unknown): boolean {
  const codeOf = (value: unknown): unknown =>
    typeof value === 'object' && value !== null && 'code' in value
      ? value.code
      : undefined;
  return (
    codeOf(error) === UNIQUE_VIOLATION ||
    (error instanceof Error && codeOf(error.cause) === UNIQUE_VIOLATION)
  );
}

@Injectable()
export class UsersService {
  private dummyHash?: Promise<string>;

  constructor(
    private readonly repository: UsersRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async create(input: CreateUserInput): Promise<UserRow> {
    const passwordHash = await this.hasher.hash(input.password);
    try {
      return await this.repository.insert({
        email: input.email.toLowerCase(),
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone ?? null,
        passwordHash,
      });
    } catch (error) {
      // The unique index decides, so two simultaneous sign-ups with the same email cannot both pass.
      if (isUniqueViolation(error)) {
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
    const user = await this.repository.findByEmail(email.toLowerCase());
    if (!user) {
      // Hash comparison anyway, so the response time does not reveal whether the account exists.
      this.dummyHash ??= this.hasher.hash(randomUUID());
      await this.hasher.verify(await this.dummyHash, password);
      return null;
    }
    const valid = await this.hasher.verify(user.passwordHash, password);
    return valid ? user : null;
  }
}
