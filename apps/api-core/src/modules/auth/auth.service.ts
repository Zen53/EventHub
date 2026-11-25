import { Injectable } from '@nestjs/common';
import type {
  ChangePasswordBody,
  LoginBody,
  RegisterBody,
} from '@eventhub/schemas';
import { AppError } from '../../core/errors/app-error.js';
import { AccessTokenService } from '../../core/security/index.js';
import { type UserRow, UsersService } from '../users/index.js';
import {
  type IssuedRefreshToken,
  RefreshTokenService,
} from './refresh-token.service.js';

export interface RefreshResult {
  accessToken: string;
  refreshToken: IssuedRefreshToken;
}

export interface LoginResult extends RefreshResult {
  user: UserRow;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly accessTokens: AccessTokenService,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  register(body: RegisterBody): Promise<UserRow> {
    return this.users.create(body);
  }

  async login({ email, password }: LoginBody): Promise<LoginResult> {
    const user = await this.users.verifyCredentials(email, password);
    if (!user) {
      throw new AppError('INVALID_CREDENTIALS');
    }
    const accessToken = this.accessTokens.sign({ userId: user.id });
    const refreshToken = this.refreshTokens.issue(user.id, user.tokenVersion);
    return { accessToken, refreshToken, user };
  }

  /**
   * Change le mot de passe : toutes les sessions sont invalidées, et la session
   * en cours reçoit un nouveau refresh token pour rester connectée.
   */
  async changePassword(
    userId: string,
    body: ChangePasswordBody,
  ): Promise<IssuedRefreshToken> {
    const user = await this.users.changePassword(userId, body);
    return this.refreshTokens.issue(user.id, user.tokenVersion);
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) {
      return;
    }
    const verified = await this.refreshTokens
      .verify(token)
      .catch((error: unknown) => {
        if (isInvalidRefreshToken(error)) {
          return null;
        }
        throw error;
      });
    if (verified) {
      await this.refreshTokens.revoke(verified);
    }
  }

  async refresh(token: string | undefined): Promise<RefreshResult> {
    if (!token) {
      throw invalidRefreshToken();
    }
    const verified = await this.refreshTokens.verify(token);
    if (!(await this.refreshTokens.revoke(verified))) {
      throw invalidRefreshToken();
    }
    const user = await this.users.findById(verified.userId);
    // Version différente : les sessions ont été invalidées depuis l'émission (EV-95).
    if (!user || user.tokenVersion !== verified.tokenVersion) {
      throw invalidRefreshToken();
    }
    const accessToken = this.accessTokens.sign({ userId: user.id });
    const refreshToken = this.refreshTokens.issue(user.id, user.tokenVersion);
    return { accessToken, refreshToken };
  }
}

const invalidRefreshToken = () => new AppError('INVALID_REFRESH_TOKEN');

export const isInvalidRefreshToken = (error: unknown) =>
  error instanceof AppError && error.code === 'INVALID_REFRESH_TOKEN';
