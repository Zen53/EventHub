import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AccessTokenGuard } from './access-token.guard.js';
import { AccessTokenService } from './access-token.service.js';

/** Global so feature modules (auth's login) can inject `AccessTokenService` without importing core. */
@Global()
@Module({
  providers: [
    AccessTokenService,
    { provide: APP_GUARD, useClass: AccessTokenGuard },
  ],
  exports: [AccessTokenService],
})
export class SecurityModule {}
