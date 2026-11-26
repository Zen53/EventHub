import type { CookieOptions, Response } from 'express';
import { REFRESH_TOKEN_TTL_MS } from './refresh-token.service.js';

export const REFRESH_TOKEN_COOKIE = 'refreshToken';

const refreshTokenCookieScope: Readonly<CookieOptions> = Object.freeze({
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/auth',
});

export const refreshTokenCookieOptions: Readonly<CookieOptions> = Object.freeze(
  {
    ...refreshTokenCookieScope,
    maxAge: REFRESH_TOKEN_TTL_MS,
  },
);

export function setRefreshTokenCookie(response: Response, token: string): void {
  response.cookie(REFRESH_TOKEN_COOKIE, token, {
    ...refreshTokenCookieOptions,
  });
}

export function clearRefreshTokenCookie(response: Response): void {
  response.clearCookie(REFRESH_TOKEN_COOKIE, { ...refreshTokenCookieScope });
}

/** En-tête `Set-Cookie` documenté dans OpenAPI par les routes qui posent un nouveau refresh token. */
export const setRefreshTokenCookieHeader = {
  'Set-Cookie': {
    description:
      'Nouveau refresh token dans le cookie `refreshToken` (`HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/auth`, 7 jours).',
    schema: { type: 'string' as const },
  },
};

/** En-tête `Set-Cookie` documenté dans OpenAPI par les routes qui suppriment le refresh token. */
export const clearRefreshTokenCookieHeader = {
  'Set-Cookie': {
    description:
      'Suppression du cookie `refreshToken` (`Path=/auth`, date d’expiration passée).',
    schema: { type: 'string' as const },
  },
};
