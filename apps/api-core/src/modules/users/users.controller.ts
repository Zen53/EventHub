import { userSchema } from '@eventhub/schemas';
import { Controller, Get } from '@nestjs/common';
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
}
