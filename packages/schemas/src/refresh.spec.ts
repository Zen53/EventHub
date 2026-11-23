import { describe, expect, it } from 'vitest';
import { refreshResponseSchema } from './auth.js';

describe('refreshResponseSchema', () => {
  it('accepts the contract response', () => {
    const response = { accessToken: 'eyJhbGciOiJIUzI1NiIs' };

    expect(refreshResponseSchema.parse(response)).toEqual(response);
  });

  it('rejects a response without accessToken', () => {
    expect(refreshResponseSchema.safeParse({}).success).toBe(false);
  });

  it('rejects a non-string accessToken', () => {
    expect(refreshResponseSchema.safeParse({ accessToken: 42 }).success).toBe(
      false,
    );
  });

  it('drops a refreshToken from the parsed response', () => {
    expect(
      refreshResponseSchema.parse({
        accessToken: 'eyJhbGciOiJIUzI1NiIs',
        refreshToken: 'leaked',
      }),
    ).toEqual({ accessToken: 'eyJhbGciOiJIUzI1NiIs' });
  });
});
