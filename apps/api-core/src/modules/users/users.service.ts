import { randomUUID } from 'node:crypto';
import type { UpdateMeBody } from '@eventhub/schemas';
import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { Transaction } from '../../core/database/index.js';
import { AppError } from '../../core/errors/app-error.js';
import type { TokenRevocations } from '../../core/security/index.js';
import { PasswordHasher } from './password-hasher.js';
import {
  isEmailConflict,
  type UserProfileChanges,
  UsersRepository,
} from './users.repository.js';
import type { UserRow } from './users.schema.js';

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
}

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const isIssuedBeforeRevocation = (
  issuedAt: Date,
  { tokensRevokedAt }: Pick<UserRow, 'tokensRevokedAt'>,
): boolean => tokensRevokedAt !== null && issuedAt < tokensRevokedAt;

@Injectable()
export class UsersService implements OnModuleInit, TokenRevocations {
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
      throw new AppError('EMAIL_ALREADY_USED');
    }
    return row;
  }

  findById(id: string): Promise<UserRow | null> {
    return this.repository.findById(id);
  }

  findByEmail(email: string): Promise<UserRow | null> {
    return this.repository.findByEmail(normalizeEmail(email));
  }

  async updateProfile(
    id: string,
    { currentPassword, email, firstName, lastName, phone }: UpdateMeBody,
  ): Promise<UserRow> {
    const changes: UserProfileChanges = {};
    if (email !== undefined) {
      await this.verifyCurrentPassword(id, currentPassword);
      changes.email = normalizeEmail(email);
    }
    if (firstName !== undefined) {
      changes.firstName = firstName;
    }
    if (lastName !== undefined) {
      changes.lastName = lastName;
    }
    if (phone !== undefined) {
      changes.phone = phone;
    }
    const row =
      Object.keys(changes).length === 0
        ? await this.repository.findById(id)
        : await this.repository.update(id, changes).catch((error: unknown) => {
            throw isEmailConflict(error)
              ? new AppError('EMAIL_ALREADY_USED')
              : error;
          });
    if (!row) {
      throw new AppError('UNAUTHORIZED');
    }
    return row;
  }

  hashPassword(password: string): Promise<string> {
    return this.hasher.hash(password);
  }

  setPassword(
    id: string,
    passwordHash: string,
    transaction: Transaction,
  ): Promise<boolean> {
    return this.repository.updatePassword(id, passwordHash, transaction);
  }

  async isRevoked(userId: string, issuedAt: Date): Promise<boolean> {
    const user = await this.repository.findById(userId);
    return !user || isIssuedBeforeRevocation(issuedAt, user);
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

  private async verifyCurrentPassword(
    id: string,
    currentPassword: string | undefined,
  ): Promise<void> {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new AppError('UNAUTHORIZED');
    }
    const valid =
      currentPassword !== undefined &&
      (await this.hasher.verify(user.passwordHash, currentPassword));
    if (!valid) {
      throw new AppError('WRONG_PASSWORD');
    }
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.hasher.hash(randomUUID()).catch((error) => {
      this.dummyHash = undefined;
      throw error;
    });
    return this.dummyHash;
  }
}
