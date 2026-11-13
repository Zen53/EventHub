import { Injectable } from '@nestjs/common';
import type { LoginBody, RegisterBody } from '@eventhub/schemas';
import { AppError } from '../../core/errors/app-error.js';
import { AccessTokenService } from '../../core/security/index.js';
import { type UserRow, UsersService } from '../users/index.js';
import {
  type IssuedRefreshToken,
  RefreshTokenService,
} from './refresh-token.service.js';

export interface LoginResult {
  accessToken: string;
  refreshToken: IssuedRefreshToken;
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
      throw new AppError(
        401,
        'INVALID_CREDENTIALS',
        'Email ou mot de passe incorrect.',
      );
    }
    const accessToken = this.accessTokens.sign({ userId: user.id });
    const refreshToken = this.refreshTokens.issue(user.id);
    return { accessToken, refreshToken, user };
  }
}
