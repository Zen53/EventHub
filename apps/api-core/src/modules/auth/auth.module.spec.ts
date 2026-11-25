import { MODULE_METADATA } from '@nestjs/common/constants.js';
import { APP_GUARD } from '@nestjs/core';
import { AccessTokenGuard } from '../../core/security/index.js';
import { UsersModule } from '../users/index.js';
import { AuthController } from './auth.controller.js';
import { AuthModule } from './auth.module.js';
import { AuthService } from './auth.service.js';
import { PasswordResetService } from './password-reset.service.js';
import { PasswordResetTokensRepository } from './password-reset-tokens.repository.js';
import { RefreshTokenService } from './refresh-token.service.js';
import { RevokedRefreshTokensRepository } from './revoked-refresh-tokens.repository.js';

describe('AuthModule', () => {
  it('wires the controller, the services and the revoked refresh tokens repository', () => {
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, AuthModule)).toEqual([
      UsersModule,
    ]);
    expect(
      Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, AuthModule),
    ).toEqual([AuthController]);
    expect(Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AuthModule)).toEqual(
      expect.arrayContaining([
        AuthService,
        RefreshTokenService,
        RevokedRefreshTokensRepository,
        PasswordResetService,
        PasswordResetTokensRepository,
      ]),
    );
  });

  it('registers AccessTokenGuard as the global guard', () => {
    expect(
      Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AuthModule),
    ).toContainEqual({ provide: APP_GUARD, useClass: AccessTokenGuard });
  });
});
