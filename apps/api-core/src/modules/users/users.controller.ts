import { type User, userSchema } from '@eventhub/schemas';
import { Controller, Get, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AppError } from '../../core/errors/app-error.js';
import { ApiErrorResponses } from '../../core/openapi/api-error-responses.js';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '../../core/security/index.js';
import { toUserResponse } from './user.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @ApiOperation({ summary: 'Consulter mon profil' })
  @ApiOkResponse({
    description: 'Le `User` connecté.',
    standardSchema: userSchema,
  })
  @ApiErrorResponses({
    status: HttpStatus.UNAUTHORIZED,
    code: 'UNAUTHORIZED',
    description: 'access token absent, invalide ou expiré.',
  })
  @Get()
  async getMe(@CurrentUser() { userId }: AuthenticatedUser): Promise<User> {
    const row = await this.users.findById(userId);
    if (!row) {
      throw new AppError('UNAUTHORIZED');
    }
    return toUserResponse(row);
  }
}
