import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppError } from '../errors/app-error.js';

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  protected override throwThrottlingException(): Promise<void> {
    return Promise.reject(new AppError('TOO_MANY_REQUESTS'));
  }
}
