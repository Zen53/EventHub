import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import {
  type LoginBody,
  loginBodySchema,
  type LoginResponse,
  type RegisterBody,
  registerBodySchema,
  type User,
} from '@eventhub/schemas';
import type { Response } from 'express';
import { Public } from '../../core/security/index.js';
import { toUserResponse } from '../users/index.js';
import { AuthService } from './auth.service.js';
import { setRefreshTokenCookie } from './refresh-token.cookie.js';

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
}
