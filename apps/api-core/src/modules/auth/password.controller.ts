import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Res,
} from '@nestjs/common';
import {
  type ChangePasswordBody,
  changePasswordBodySchema,
} from '@eventhub/schemas';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiEndpoint } from '../../core/openapi/api-endpoint.js';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '../../core/security/index.js';
import { AuthService } from './auth.service.js';
import {
  setRefreshTokenCookie,
  setRefreshTokenCookieHeader,
} from './refresh-token.cookie.js';

/**
 * `PATCH /me/password` vit dans le module auth, et non dans users : il doit
 * émettre un nouveau refresh token pour la session en cours.
 */
@ApiTags('Users')
@Controller('me')
export class PasswordController {
  constructor(private readonly auth: AuthService) {}

  @ApiEndpoint('Changer mon mot de passe', {
    description:
      'Vérifie le mot de passe actuel, puis enregistre le nouveau. Tous les refresh tokens de l’utilisateur sont invalidés ; la session en cours reçoit un nouveau refresh token en cookie et reste connectée. Les access tokens déjà émis restent valides jusqu’à leur expiration (15 minutes).',
    headers: setRefreshTokenCookieHeader,
    errors: ['WRONG_PASSWORD'],
  })
  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() { userId }: AuthenticatedUser,
    @Body({ schema: changePasswordBodySchema }) body: ChangePasswordBody,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const refreshToken = await this.auth.changePassword(userId, body);
    setRefreshTokenCookie(response, refreshToken.token);
  }
}
