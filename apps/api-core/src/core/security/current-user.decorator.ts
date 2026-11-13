import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type {
  AuthenticatedRequest,
  AuthenticatedUser,
} from './authenticated-user.js';

export function currentUserFactory(
  _data: unknown,
  context: ExecutionContext,
): AuthenticatedUser {
  const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!user) {
    // Only reachable on a `@Public()` route: a programming error, not a client one.
    throw new Error(
      '@CurrentUser() used on a route without an authenticated user',
    );
  }
  return user;
}

/** Injects `{ userId }` of the caller, attached by `AccessTokenGuard`. */
export const CurrentUser = createParamDecorator(currentUserFactory);
