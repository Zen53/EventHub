import { randomUUID } from 'node:crypto';
import { Injectable, type OnModuleInit } from '@nestjs/common';
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

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

@Injectable()
export class UsersService implements OnModuleInit {
  private dummyHash?: Promise<string>;

  constructor(
    private readonly repository: UsersRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.getDummyHash();
  }

  async create(input: CreateUserInput): Promise<UserRow> {
    const passwordHash = await this.hasher.hash(input.password);
    const row = await this.repository.insert({
      email: normalizeEmail(input.email),
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone ?? null,
      passwordHash,
    });
    if (!row) {
      throw new AppError(
        409,
        'EMAIL_ALREADY_USED',
        'Cet email est déjà associé à un compte.',
      );
    }
    return row;
  }

  findById(id: string): Promise<UserRow | null> {
    return this.repository.findById(id);
  }

  async verifyCredentials(
    email: string,
    password: string,
  ): Promise<UserRow | null> {
    const user = await this.repository.findByEmail(normalizeEmail(email));
    if (!user) {
      await this.hasher.verify(await this.getDummyHash(), password);
      return null;
    }
    const valid = await this.hasher.verify(user.passwordHash, password);
    return valid ? user : null;
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.hasher.hash(randomUUID()).catch((error) => {
      this.dummyHash = undefined;
      throw error;
    });
    return this.dummyHash;
  }
}
