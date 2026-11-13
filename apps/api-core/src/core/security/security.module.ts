import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AccessTokenGuard } from './access-token.guard.js';
import { AccessTokenService } from './access-token.service.js';

@Global()
@Module({
  providers: [
    AccessTokenService,
    { provide: APP_GUARD, useClass: AccessTokenGuard },
  ],
  exports: [AccessTokenService],
})
export class SecurityModule {}
