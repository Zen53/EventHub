import type { Response } from 'express';
import {
  REFRESH_TOKEN_COOKIE,
  refreshTokenCookieOptions,
  setRefreshTokenCookie,
} from './refresh-token.cookie.js';

describe('refresh token cookie', () => {
  it('follows the contract options', () => {
    expect(REFRESH_TOKEN_COOKIE).toBe('refreshToken');
    expect(refreshTokenCookieOptions).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  });

  it('sets the token in the refreshToken cookie with these options', () => {
    const response = { cookie: vi.fn() };

    setRefreshTokenCookie(response as unknown as Response, 'opaque-token');

    expect(response.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'opaque-token',
      refreshTokenCookieOptions,
    );
  });
});
