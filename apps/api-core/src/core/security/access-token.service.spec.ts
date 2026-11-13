import { createHmac } from 'node:crypto';
import type { ConfigService } from '@nestjs/config';
import { JwtSigner } from '@nestjs/authentication';
import type { Env } from '../config/env.schema.js';
import { AppError } from '../errors/app-error.js';
import { AccessTokenService } from './access-token.service.js';

const SECRET = 'test-only-access-secret-of-32-chars!';
const USER_ID = '7b1e4c1a-2f0e-4a8c-9a51-0d1f2c3b4a59';

const serviceWith = (secret: string) =>
  new AccessTokenService({
    get: () => secret,
  } as unknown as ConfigService<Env, true>);

const base64url = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

const handMade = (header: object, claims: object, hash = 'sha256') => {
  const signingInput = `${base64url(header)}.${base64url(claims)}`;
  const signature = createHmac(hash, SECRET)
    .update(signingInput)
    .digest('base64url');
  return `${signingInput}.${signature}`;
};

const nowSeconds = () => Math.floor(Date.now() / 1000);
const validClaims = () => ({
  sub: USER_ID,
  iss: 'eventhub-api',
  aud: 'eventhub-api',
  iat: nowSeconds(),
  exp: nowSeconds() + 60,
});

const expectUnauthorized = async (promise: Promise<unknown>) => {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppError);
  expect(error).toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
};

describe('AccessTokenService', () => {
  const service = serviceWith(SECRET);

  afterEach(() => {
    vi.useRealTimers();
  });

  it('signs a token that verifies back to the same userId', async () => {
    await expect(
      service.verify(service.sign({ userId: USER_ID })),
    ).resolves.toEqual({
      userId: USER_ID,
    });
  });

  it('signs a 15-minute HS256 token with sub = userId', () => {
    const [header, payload] = service
      .sign({ userId: USER_ID })
      .split('.')
      .slice(0, 2)
      .map((part) => JSON.parse(Buffer.from(part, 'base64url').toString()));
    expect(header.alg).toBe('HS256');
    expect(payload.sub).toBe(USER_ID);
    expect(payload.exp - payload.iat).toBe(15 * 60);
  });

  it('refuses an expired token', async () => {
    vi.useFakeTimers();
    const token = service.sign({ userId: USER_ID });
    vi.advanceTimersByTime(15 * 60 * 1000 + 1000);
    await expectUnauthorized(service.verify(token));
  });

  it('accepts a token just before it expires', async () => {
    vi.useFakeTimers();
    const token = service.sign({ userId: USER_ID });
    vi.advanceTimersByTime(15 * 60 * 1000 - 1000);
    await expect(service.verify(token)).resolves.toEqual({ userId: USER_ID });
  });

  it('refuses a token signed with another secret', async () => {
    const other = serviceWith('another-test-secret-of-32-chars!!!');
    await expectUnauthorized(service.verify(other.sign({ userId: USER_ID })));
  });

  it('refuses a token whose payload was altered', async () => {
    const [header, , signature] = service.sign({ userId: USER_ID }).split('.');
    const forged = base64url({ ...validClaims(), sub: 'someone-else' });
    await expectUnauthorized(
      service.verify(`${header}.${forged}.${signature}`),
    );
  });

  it('refuses a token whose signature was altered', async () => {
    const token = service.sign({ userId: USER_ID });
    const last = token.at(-1) === 'A' ? 'B' : 'A';
    await expectUnauthorized(service.verify(token.slice(0, -1) + last));
  });

  it.each(['', 'not-a-jwt', 'a.b.c'])(
    'refuses the malformed token %j',
    async (token) => {
      await expectUnauthorized(service.verify(token));
    },
  );

  it('refuses an unsigned token (alg: none)', async () => {
    const token = `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url(validClaims())}.`;
    await expectUnauthorized(service.verify(token));
  });

  it('refuses another HMAC algorithm than HS256', async () => {
    const token = handMade(
      { alg: 'HS512', typ: 'JWT' },
      validClaims(),
      'sha512',
    );
    await expectUnauthorized(service.verify(token));
  });

  it('refuses a token from another issuer or audience', async () => {
    const otherIssuer = new JwtSigner({
      key: SECRET,
      issuer: 'elsewhere',
      audience: 'eventhub-api',
    });
    const otherAudience = new JwtSigner({
      key: SECRET,
      issuer: 'eventhub-api',
      audience: 'elsewhere',
    });
    await expectUnauthorized(
      service.verify(otherIssuer.sign({ sub: USER_ID })),
    );
    await expectUnauthorized(
      service.verify(otherAudience.sign({ sub: USER_ID })),
    );
  });

  it.each([
    ['without exp', { exp: undefined }],
    ['without sub', { sub: undefined }],
    ['with an empty sub', { sub: '' }],
    ['with a non-string sub', { sub: 42 }],
  ])('refuses a correctly signed token %s', async (_, override) => {
    const token = handMade(
      { alg: 'HS256', typ: 'JWT' },
      { ...validClaims(), ...override },
    );
    await expectUnauthorized(service.verify(token));
  });
});
