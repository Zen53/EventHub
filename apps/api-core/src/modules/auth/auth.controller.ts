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
  loginResponseSchema,
  type RefreshResponse,
  refreshResponseSchema,
  type RegisterBody,
  registerBodySchema,
  type User,
  userSchema,
} from '@eventhub/schemas';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ApiErrorResponses } from '../../core/openapi/api-error-responses.js';
import { Public } from '../../core/security/index.js';
import { toUserResponse } from '../users/index.js';
import { AuthService, isInvalidRefreshToken } from './auth.service.js';
import {
  clearRefreshTokenCookie,
  REFRESH_TOKEN_COOKIE,
  setRefreshTokenCookie,
} from './refresh-token.cookie.js';

const VALIDATION_ERROR = {
  status: HttpStatus.BAD_REQUEST,
  code: 'VALIDATION_ERROR',
  description: 'un ou plusieurs champs sont invalides (`details` rempli).',
};

const setRefreshTokenCookieHeader = {
  'Set-Cookie': {
    description:
      'Nouveau refresh token dans le cookie `refreshToken` (`HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/auth`, 7 jours).',
    schema: { type: 'string' as const },
  },
};

const clearRefreshTokenCookieHeader = {
  'Set-Cookie': {
    description:
      'Suppression du cookie `refreshToken` (`Path=/auth`, date d’expiration passée).',
    schema: { type: 'string' as const },
  },
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @ApiOperation({ summary: 'Créer un compte' })
  @ApiCreatedResponse({
    description:
      'Le `User` créé. L’utilisateur n’est pas connecté : aucun token n’est émis.',
    standardSchema: userSchema,
  })
  @ApiErrorResponses(VALIDATION_ERROR, {
    status: HttpStatus.CONFLICT,
    code: 'EMAIL_ALREADY_USED',
    description: 'email déjà associé à un autre compte.',
  })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body({ schema: registerBodySchema }) body: RegisterBody,
  ): Promise<User> {
    return toUserResponse(await this.auth.register(body));
  }

  @Public()
  @ApiOperation({ summary: 'Se connecter' })
  @ApiOkResponse({
    description:
      'L’access token et le `User`. Le refresh token est posé en cookie.',
    standardSchema: loginResponseSchema,
    headers: setRefreshTokenCookieHeader,
  })
  @ApiErrorResponses(VALIDATION_ERROR, {
    status: HttpStatus.UNAUTHORIZED,
    code: 'INVALID_CREDENTIALS',
    description:
      'email ou mot de passe incorrect, avec le même message dans les deux cas.',
  })
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
  @ApiOperation({ summary: 'Renouveler l’access token' })
  @ApiCookieAuth()
  @ApiOkResponse({
    description:
      'Un nouvel access token. Le refresh token est renouvelé (rotation) et l’ancien est invalidé.',
    standardSchema: refreshResponseSchema,
    headers: setRefreshTokenCookieHeader,
  })
  @ApiErrorResponses({
    status: HttpStatus.UNAUTHORIZED,
    code: 'INVALID_REFRESH_TOKEN',
    description:
      'refresh token absent, expiré ou déjà utilisé. Le cookie est supprimé quand il était présent.',
  })
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
  @ApiOperation({ summary: 'Se déconnecter' })
  @ApiCookieAuth()
  @ApiNoContentResponse({
    description:
      'Sans corps. Le refresh token est invalidé et le cookie supprimé, même si le token était déjà invalide.',
    headers: clearRefreshTokenCookieHeader,
  })
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
