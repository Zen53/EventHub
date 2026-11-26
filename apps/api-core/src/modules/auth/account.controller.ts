import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { type DeleteMeBody, deleteMeBodySchema } from '@eventhub/schemas';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiEndpoint } from '../../core/openapi/api-endpoint.js';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '../../core/security/index.js';
import { AccountService } from './account.service.js';
import {
  clearRefreshTokenCookie,
  clearRefreshTokenCookieHeader,
} from './refresh-token.cookie.js';

/**
 * `DELETE /me` vit dans le module auth, et non dans users : il supprime le
 * cookie de refresh et consulte les événements de l'utilisateur.
 */
@ApiTags('Users')
@Controller('me')
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @ApiEndpoint('Supprimer mon compte', {
    description:
      'Exige le mot de passe. Refusée tant que l’utilisateur organise des événements publiés à venir. Le compte est anonymisé (email libéré, nom remplacé, téléphone et mot de passe effacés), toutes ses sessions sont invalidées et le cookie de refresh est supprimé. Les access tokens déjà émis sont refusés par `GET /me` et les routes qui lisent le compte.',
    headers: clearRefreshTokenCookieHeader,
    errors: ['WRONG_PASSWORD', 'ACCOUNT_HAS_UPCOMING_EVENTS'],
  })
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMe(
    @CurrentUser() { userId }: AuthenticatedUser,
    @Body({ schema: deleteMeBodySchema }) body: DeleteMeBody,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.account.deleteAccount(userId, body);
    clearRefreshTokenCookie(response);
  }
}
