import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  type RegisterBody,
  registerBodySchema,
  type User,
} from '@eventhub/schemas';
import { Public } from '../../core/security/index.js';
import { toUserResponse } from '../users/index.js';
import { AuthService } from './auth.service.js';

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
}
