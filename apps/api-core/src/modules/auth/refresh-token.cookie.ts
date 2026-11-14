import type { CookieOptions, Response } from 'express';
import { REFRESH_TOKEN_TTL_MS } from './refresh-token.service.js';

export const REFRESH_TOKEN_COOKIE = 'refreshToken';

export const refreshTokenCookieOptions: Readonly<CookieOptions> = Object.freeze(
  {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/auth',
    maxAge: REFRESH_TOKEN_TTL_MS,
  },
);

export function setRefreshTokenCookie(response: Response, token: string): void {
  response.cookie(REFRESH_TOKEN_COOKIE, token, {
    ...refreshTokenCookieOptions,
  });
}
