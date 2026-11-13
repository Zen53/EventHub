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
    throw new Error(
      '@CurrentUser() used on a route without an authenticated user',
    );
  }
  return user;
}

export const CurrentUser = createParamDecorator(currentUserFactory);
