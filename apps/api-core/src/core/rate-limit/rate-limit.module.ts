import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

const DEFAULT_RATE_LIMIT = { limit: 60, ttl: 60 * 1000 };

@Module({
  imports: [ThrottlerModule.forRoot([DEFAULT_RATE_LIMIT])],
})
export class RateLimitModule {}
