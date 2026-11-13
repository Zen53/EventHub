import type { User } from '@eventhub/schemas';
import { Controller, Get } from '@nestjs/common';
import { AppError } from '../../core/errors/app-error.js';
import {
  type AuthenticatedUser,
  CurrentUser,
} from '../../core/security/index.js';
import { toUserResponse } from './user.dto.js';
import { UsersService } from './users.service.js';

@Controller('me')
export class MeController {
  constructor(private readonly users: UsersService) {}

  @Get()
  async getMe(@CurrentUser() { userId }: AuthenticatedUser): Promise<User> {
    const row = await this.users.findById(userId);
    if (!row) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }
    return toUserResponse(row);
  }
}
