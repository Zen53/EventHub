import type { Request } from 'express';

/** The identity proven by a valid access token. */
export interface AuthenticatedUser {
  userId: string;
}

/** A request that went through `AccessTokenGuard`; `user` is unset on `@Public()` routes. */
export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };
