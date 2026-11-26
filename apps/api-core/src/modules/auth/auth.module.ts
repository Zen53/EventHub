import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AccessTokenGuard } from '../../core/security/index.js';
import { EventsModule } from '../events/index.js';
import { UsersModule } from '../users/index.js';
import { AccountController } from './account.controller.js';
import { AccountService } from './account.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PasswordController } from './password.controller.js';
import { PasswordResetService } from './password-reset.service.js';
import { PasswordResetTokensRepository } from './password-reset-tokens.repository.js';
import { RefreshTokenService } from './refresh-token.service.js';
import { RevokedRefreshTokensRepository } from './revoked-refresh-tokens.repository.js';

@Module({
  imports: [UsersModule, EventsModule],
  controllers: [AuthController, PasswordController, AccountController],
  providers: [
    { provide: APP_GUARD, useClass: AccessTokenGuard },
    AuthService,
    RefreshTokenService,
    RevokedRefreshTokensRepository,
    PasswordResetService,
    PasswordResetTokensRepository,
    AccountService,
  ],
})
export class AuthModule {}
