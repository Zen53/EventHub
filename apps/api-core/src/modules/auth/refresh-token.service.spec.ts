import { createHmac } from 'node:crypto';
import type { ConfigService } from '@nestjs/config';
import { JwtSigner } from '@nestjs/authentication';
import type { Env } from '../../core/config/env.schema.js';
import { AppError } from '../../core/errors/app-error.js';
import { AccessTokenService } from '../../core/security/index.js';
import {
  REFRESH_TOKEN_AUDIENCE,
  REFRESH_TOKEN_TTL_MS,
  RefreshTokenService,
} from './refresh-token.service.js';
import type { RevokedRefreshTokensRepository } from './revoked-refresh-tokens.repository.js';

const SECRET = 'test-only-access-secret-of-32-chars!';
const USER_ID = 'a1b2c3d4-0000-4000-8000-000000000002';
const NOW = new Date('2026-11-13T10:00:00Z');
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const configWith = (secret: string) =>
  ({ get: () => secret }) as unknown as ConfigService<Env, true>;

const revokedRepository = () => ({
  revoke: vi.fn().mockResolvedValue(true),
  isRevoked: vi.fn().mockResolvedValue(false),
});

const refreshService = (
  secret = SECRET,
  revoked: ReturnType<typeof revokedRepository> = revokedRepository(),
) =>
  new RefreshTokenService(
    configWith(secret),
    revoked as unknown as RevokedRefreshTokensRepository,
  );

const decode = (part: string) =>
  JSON.parse(Buffer.from(part, 'base64url').toString()) as Record<
    string,
    unknown
  >;

const base64url = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

const handMade = (claims: object) => {
  const signingInput = `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(claims)}`;
  const signature = createHmac('sha256', SECRET)
    .update(signingInput)
    .digest('base64url');
  return `${signingInput}.${signature}`;
};

const validClaims = () => {
  const iat = Math.floor(Date.now() / 1000);
  return {
    sub: USER_ID,
    jti: 'c1b2c3d4-0000-4000-8000-000000000003',
    iss: 'eventhub-api',
    aud: REFRESH_TOKEN_AUDIENCE,
    iat,
    exp: iat + 60,
  };
};

const expectInvalidRefreshToken = async (promise: Promise<unknown>) => {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppError);
  expect(error).toMatchObject({ status: 401, code: 'INVALID_REFRESH_TOKEN' });
};

describe('RefreshTokenService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('issue', () => {
    it('signs an HS256 JWT with sub, a UUID jti, the refresh audience and the shared issuer', () => {
      const { token, jti } = refreshService().issue(USER_ID);
      const [header, payload] = token.split('.').slice(0, 2).map(decode);

      expect(header.alg).toBe('HS256');
      expect(jti).toMatch(UUID);
      expect(payload).toMatchObject({
        sub: USER_ID,
        jti,
        iss: 'eventhub-api',
        aud: 'eventhub-refresh',
      });
    });

    it('expires 7 days after issuance', () => {
      const { token, expiresAt } = refreshService().issue(USER_ID);
      const payload = decode(token.split('.')[1]);

      expect(REFRESH_TOKEN_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
      expect(expiresAt).toEqual(new Date('2026-11-20T10:00:00Z'));
      expect(payload.iat).toBe(NOW.getTime() / 1000);
      expect(payload.exp).toBe(expiresAt.getTime() / 1000);
    });

    it('uses a different jti and token on each issuance', () => {
      const service = refreshService();

      const first = service.issue(USER_ID);
      const second = service.issue(USER_ID);

      expect(first.jti).not.toBe(second.jti);
      expect(first.token).not.toBe(second.token);
    });
  });

  describe('verify', () => {
    it('returns the userId, jti and expiration of an issued token', async () => {
      const service = refreshService();
      const issued = service.issue(USER_ID);

      await expect(service.verify(issued.token)).resolves.toEqual({
        userId: USER_ID,
        jti: issued.jti,
        expiresAt: issued.expiresAt,
      });
    });

    it('refuses an access token signed with the same secret', async () => {
      const accessToken = new AccessTokenService(configWith(SECRET)).sign({
        userId: USER_ID,
      });

      await expectInvalidRefreshToken(refreshService().verify(accessToken));
    });

    it('is refused by the access token verifier', async () => {
      const { token } = refreshService().issue(USER_ID);
      const error = await new AccessTokenService(configWith(SECRET))
        .verify(token)
        .catch((e: unknown) => e);

      expect(error).toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
    });

    it('refuses an expired token', async () => {
      const service = refreshService();
      const { token } = service.issue(USER_ID);

      vi.advanceTimersByTime(REFRESH_TOKEN_TTL_MS + 1000);

      await expectInvalidRefreshToken(service.verify(token));
    });

    it('accepts a token just before it expires', async () => {
      const service = refreshService();
      const { token } = service.issue(USER_ID);

      vi.advanceTimersByTime(REFRESH_TOKEN_TTL_MS - 1000);

      await expect(service.verify(token)).resolves.toMatchObject({
        userId: USER_ID,
      });
    });

    it('refuses a token whose payload was altered', async () => {
      const [header, , signature] = refreshService()
        .issue(USER_ID)
        .token.split('.');
      const forged = base64url({ ...validClaims(), sub: 'someone-else' });

      await expectInvalidRefreshToken(
        refreshService().verify(`${header}.${forged}.${signature}`),
      );
    });

    it('refuses a token whose signature was altered', async () => {
      const { token } = refreshService().issue(USER_ID);
      const last = token.at(-1) === 'A' ? 'B' : 'A';

      await expectInvalidRefreshToken(
        refreshService().verify(token.slice(0, -1) + last),
      );
    });

    it('refuses a token signed with another secret', async () => {
      const { token } = refreshService(
        'another-test-secret-of-32-chars!!!',
      ).issue(USER_ID);

      await expectInvalidRefreshToken(refreshService().verify(token));
    });

    it('refuses a token from another issuer', async () => {
      const token = new JwtSigner({
        key: SECRET,
        issuer: 'elsewhere',
        audience: REFRESH_TOKEN_AUDIENCE,
      }).sign({ sub: USER_ID });

      await expectInvalidRefreshToken(refreshService().verify(token));
    });

    it.each(['', 'not-a-jwt', 'a.b.c'])(
      'refuses the malformed token %j',
      async (token) => {
        await expectInvalidRefreshToken(refreshService().verify(token));
      },
    );

    it('refuses an unsigned token (alg: none)', async () => {
      const token = `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url(validClaims())}.`;

      await expectInvalidRefreshToken(refreshService().verify(token));
    });

    it.each([
      ['without jti', { jti: undefined }],
      ['with an empty jti', { jti: '' }],
      ['without iat', { iat: undefined }],
      ['without exp', { exp: undefined }],
      ['without sub', { sub: undefined }],
      ['with an empty sub', { sub: '' }],
      ['with a non-string sub', { sub: 42 }],
    ])('refuses a correctly signed token %s', async (_, override) => {
      await expectInvalidRefreshToken(
        refreshService().verify(handMade({ ...validClaims(), ...override })),
      );
    });
  });

  describe('revocation', () => {
    const verified = {
      userId: USER_ID,
      jti: 'c1b2c3d4-0000-4000-8000-000000000003',
      expiresAt: new Date('2026-11-20T10:00:00Z'),
    };

    it('revokes the jti until its expiration and returns whether it was newly revoked', async () => {
      const revoked = revokedRepository();
      revoked.revoke.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      const service = refreshService(SECRET, revoked);

      await expect(service.revoke(verified)).resolves.toBe(true);
      await expect(service.revoke(verified)).resolves.toBe(false);
      expect(revoked.revoke).toHaveBeenCalledWith(
        verified.jti,
        verified.expiresAt,
      );
    });

    it('tells whether a jti is revoked', async () => {
      const revoked = revokedRepository();
      revoked.isRevoked.mockResolvedValue(true);

      await expect(
        refreshService(SECRET, revoked).isRevoked(verified.jti),
      ).resolves.toBe(true);
      expect(revoked.isRevoked).toHaveBeenCalledWith(verified.jti);
    });

    it('does not consult the revocation list in verify', async () => {
      const revoked = revokedRepository();
      const service = refreshService(SECRET, revoked);

      await service.verify(service.issue(USER_ID).token);

      expect(revoked.isRevoked).not.toHaveBeenCalled();
    });
  });
});
