import {
  type UpdateMeBody,
  updateMeBodySchema,
  userSchema,
} from '@eventhub/schemas';
import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AppError } from '../../core/errors/app-error.js';
import { ApiEndpoint } from '../../core/openapi/api-endpoint.js';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '../../core/security/index.js';
import { toUserResponse } from './user.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('Users')
@Controller('me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @ApiEndpoint('Consulter mon profil', { response: userSchema })
  @Get()
  async getMe(@CurrentUser() { userId }: AuthenticatedUser) {
    const row = await this.users.findById(userId);
    if (!row) {
      throw new AppError('UNAUTHORIZED');
    }
    return toUserResponse(row);
  }

  @ApiEndpoint('Modifier mon profil', {
    description:
      'Seuls les champs envoyés sont modifiés, et au moins un doit l’être. `"phone": null` efface le téléphone. Changer l’email exige le mot de passe actuel dans `currentPassword`, qui est refusé sans `email`. `id`, `createdAt`, `updatedAt` et `password` sont refusés.',
    response: userSchema,
    errors: ['WRONG_PASSWORD', 'EMAIL_ALREADY_USED'],
  })
  @Patch()
  async updateMe(
    @CurrentUser() { userId }: AuthenticatedUser,
    @Body({ schema: updateMeBodySchema }) body: UpdateMeBody,
  ) {
    return toUserResponse(await this.users.updateProfile(userId, body));
  }
}
