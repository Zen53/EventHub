import { applyDecorators, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RateLimitGuard } from './rate-limit.guard.js';

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export const RateLimit = ({ limit, windowMs }: RateLimitOptions) =>
  applyDecorators(
    UseGuards(RateLimitGuard),
    Throttle({ default: { limit, ttl: windowMs } }),
  );
