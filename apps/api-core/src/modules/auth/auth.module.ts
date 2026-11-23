import { Module } from '@nestjs/common';
import { UsersModule } from '../users/index.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { RefreshTokenService } from './refresh-token.service.js';
import { RevokedRefreshTokensRepository } from './revoked-refresh-tokens.repository.js';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, RefreshTokenService, RevokedRefreshTokensRepository],
})
export class AuthModule {}
