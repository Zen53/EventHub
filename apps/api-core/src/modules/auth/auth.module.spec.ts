import { MODULE_METADATA } from '@nestjs/common/constants.js';
import { UsersModule } from '../users/index.js';
import { AuthController } from './auth.controller.js';
import { AuthModule } from './auth.module.js';
import { AuthService } from './auth.service.js';
import { PasswordController } from './password.controller.js';
import { RefreshTokenService } from './refresh-token.service.js';
import { RevokedRefreshTokensRepository } from './revoked-refresh-tokens.repository.js';

describe('AuthModule', () => {
  it('wires the controllers, the services and the revoked refresh tokens repository', () => {
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, AuthModule)).toEqual([
      UsersModule,
    ]);
    expect(
      Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, AuthModule),
    ).toEqual([AuthController, PasswordController]);
    expect(Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AuthModule)).toEqual(
      expect.arrayContaining([
        AuthService,
        RefreshTokenService,
        RevokedRefreshTokensRepository,
      ]),
    );
  });
});
