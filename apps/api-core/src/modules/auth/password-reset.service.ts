import { createHash, randomBytes } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Mailer } from '@nestjs/mail';
import type { Env } from '../../core/config/env.schema.js';
import { type UserRow, UsersService } from '../users/index.js';
import { passwordResetMail } from './password-reset.mail.js';
import { PasswordResetTokensRepository } from './password-reset-tokens.repository.js';

export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
export const PASSWORD_RESET_TOKEN_BYTES = 32;
export const PASSWORD_RESET_PATH = '/reset-password';

export const hashPasswordResetToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly users: UsersService,
    private readonly tokens: PasswordResetTokensRepository,
    private readonly mailer: Mailer,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async request(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user) {
      return;
    }
    const token = randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString('base64url');
    await this.tokens.replaceForUser({
      userId: user.id,
      tokenHash: hashPasswordResetToken(token),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
    });
    void this.send(user, token);
  }

  private async send(user: UserRow, token: string): Promise<void> {
    try {
      await this.mailer.send(
        passwordResetMail({
          to: user.email,
          firstName: user.firstName,
          resetUrl: this.resetUrl(token),
        }),
      );
    } catch (error) {
      this.logger.error(
        `Password reset email not sent to user ${user.id}: ${error instanceof Error ? error.name : 'unknown error'}`,
      );
    }
  }

  private resetUrl(token: string): string {
    const url = new URL(
      PASSWORD_RESET_PATH,
      this.config.get('WEB_URL', { infer: true }),
    );
    url.searchParams.set('token', token);
    return url.toString();
  }
}
