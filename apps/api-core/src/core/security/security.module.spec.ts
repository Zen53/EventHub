import { Injectable, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { envSchema } from '../config/env.schema.js';
import { AccessTokenGuard } from './access-token.guard.js';
import { AccessTokenService } from './access-token.service.js';
import { SecurityModule } from './security.module.js';

@Injectable()
class Login {
  constructor(readonly accessTokens: AccessTokenService) {}
}

@Module({ providers: [Login] })
class FeatureModule {}

describe('SecurityModule', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://user:pass@localhost:5432/db');
    vi.stubEnv('JWT_ACCESS_SECRET', 'test-only-access-secret-of-32-chars!');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('gives feature modules an AccessTokenService built from JWT_ACCESS_SECRET', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          validationSchema: envSchema,
        }),
        SecurityModule,
        FeatureModule,
      ],
    }).compile();

    const { accessTokens } = moduleRef.get(Login);
    const token = accessTokens.sign({ userId: 'user-1' });
    await expect(
      moduleRef.get(AccessTokenService).verify(token),
    ).resolves.toEqual({
      userId: 'user-1',
    });
  });

  it('registers AccessTokenGuard as the global guard', () => {
    const providers = Reflect.getMetadata(
      'providers',
      SecurityModule,
    ) as unknown[];
    expect(providers).toContainEqual({
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    });
  });
});
