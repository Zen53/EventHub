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
  type ForgotPasswordBody,
  forgotPasswordBodySchema,
  type LoginBody,
  loginBodySchema,
  loginResponseSchema,
  refreshResponseSchema,
  type RegisterBody,
  registerBodySchema,
  userSchema,
} from '@eventhub/schemas';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ApiEndpoint } from '../../core/openapi/api-endpoint.js';
import { Public } from '../../core/security/index.js';
import { toUserResponse } from '../users/index.js';
import { AuthService, isInvalidRefreshToken } from './auth.service.js';
import { PasswordResetService } from './password-reset.service.js';
import {
  clearRefreshTokenCookie,
  REFRESH_TOKEN_COOKIE,
  setRefreshTokenCookie,
} from './refresh-token.cookie.js';

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
  constructor(
    private readonly auth: AuthService,
    private readonly passwordResets: PasswordResetService,
  ) {}

  @Public()
  @ApiEndpoint('Créer un compte', {
    description: 'L’utilisateur n’est pas connecté : aucun token n’est émis.',
    response: userSchema,
    errors: ['EMAIL_ALREADY_USED'],
  })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body({ schema: registerBodySchema }) body: RegisterBody) {
    return toUserResponse(await this.auth.register(body));
  }

  @Public()
  @ApiEndpoint('Se connecter', {
    description:
      'Renvoie l’access token et le `User`, et pose le refresh token en cookie. Le message d’erreur est le même que l’email soit inconnu ou que le mot de passe soit faux.',
    response: loginResponseSchema,
    headers: setRefreshTokenCookieHeader,
    errors: ['INVALID_CREDENTIALS'],
  })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body({ schema: loginBodySchema }) body: LoginBody,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken, refreshToken, user } = await this.auth.login(body);
    setRefreshTokenCookie(response, refreshToken.token);
    return { accessToken, user: toUserResponse(user) };
  }

  @Public()
  @ApiCookieAuth()
  @ApiEndpoint('Renouveler l’access token', {
    description:
      'Émet un nouveau refresh token (rotation) et invalide l’ancien. Le cookie est supprimé quand le refresh token est refusé.',
    response: refreshResponseSchema,
    headers: setRefreshTokenCookieHeader,
    errors: ['INVALID_REFRESH_TOKEN'],
  })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
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
  @ApiCookieAuth()
  @ApiEndpoint('Se déconnecter', {
    description:
      'Invalide le refresh token et supprime le cookie. Répond 204 même si le token était déjà invalide.',
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

  @Public()
  @ApiEndpoint('Demander la réinitialisation du mot de passe', {
    description:
      'Envoie par email un lien de réinitialisation valable 1 heure, qui invalide les liens précédents. Répond 204 que l’email ait un compte ou non.',
  })
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async forgotPassword(
    @Body({ schema: forgotPasswordBodySchema }) body: ForgotPasswordBody,
  ): Promise<void> {
    await this.passwordResets.request(body.email);
  }
}

const refreshTokenOf = (request: Request): string | undefined => {
  const token: unknown = request.cookies?.[REFRESH_TOKEN_COOKIE];
  return typeof token === 'string' ? token : undefined;
};
