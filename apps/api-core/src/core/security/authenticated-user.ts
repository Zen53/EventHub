import type { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
}

export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };
