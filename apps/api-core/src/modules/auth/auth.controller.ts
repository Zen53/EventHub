import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  type LoginBody,
  loginBodySchema,
  type LoginResponse,
  type RefreshResponse,
  type RegisterBody,
  registerBodySchema,
  type User,
} from '@eventhub/schemas';
import type { Request, Response } from 'express';
import { Public } from '../../core/security/index.js';
import { toUserResponse } from '../users/index.js';
import { AuthService, isInvalidRefreshToken } from './auth.service.js';
import {
  clearRefreshTokenCookie,
  REFRESH_TOKEN_COOKIE,
  setRefreshTokenCookie,
} from './refresh-token.cookie.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body({ schema: registerBodySchema }) body: RegisterBody,
  ): Promise<User> {
    return toUserResponse(await this.auth.register(body));
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body({ schema: loginBodySchema }) body: LoginBody,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    const { accessToken, refreshToken, user } = await this.auth.login(body);
    setRefreshTokenCookie(response, refreshToken.token);
    return { accessToken, user: toUserResponse(user) };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<RefreshResponse> {
    try {
      const { accessToken, refreshToken } = await this.auth.refresh(
        refreshTokenOf(request),
      );
      setRefreshTokenCookie(response, refreshToken.token);
      return { accessToken };
    } catch (error) {
      if (isInvalidRefreshToken(error)) {
        clearRefreshTokenCookie(response);
      }
      throw error;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(refreshTokenOf(request));
    clearRefreshTokenCookie(response);
  }
}

const refreshTokenOf = (request: Request): string | undefined => {
  const token: unknown = request.cookies?.[REFRESH_TOKEN_COOKIE];
  return typeof token === 'string' ? token : undefined;
};
