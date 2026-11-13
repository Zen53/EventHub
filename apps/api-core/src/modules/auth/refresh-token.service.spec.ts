import { createHash } from 'node:crypto';
import type { RefreshTokensRepository } from './refresh-tokens.repository.js';
import {
  hashRefreshToken,
  REFRESH_TOKEN_TTL_MS,
  RefreshTokenService,
} from './refresh-token.service.js';

const userId = 'a1b2c3d4-0000-4000-8000-000000000002';
const now = new Date('2026-11-13T10:00:00Z');

function setup() {
  const repository = { insert: vi.fn().mockResolvedValue({}) };
  const service = new RefreshTokenService(
    repository as unknown as RefreshTokensRepository,
  );
  return { service, repository };
}

describe('RefreshTokenService.issue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns an opaque base64url token of at least 32 random bytes', async () => {
    const { service } = setup();

    const { token } = await service.issue(userId);

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(Buffer.from(token, 'base64url').length).toBeGreaterThanOrEqual(32);
    expect(token.split('.')).toHaveLength(1);
  });

  it('returns a different token on each call', async () => {
    const { service } = setup();

    const first = await service.issue(userId);
    const second = await service.issue(userId);

    expect(first.token).not.toBe(second.token);
  });

  it('stores the SHA-256 hash of the token and never the token itself', async () => {
    const { service, repository } = setup();

    const { token } = await service.issue(userId);

    const expectedHash = createHash('sha256').update(token).digest('hex');
    expect(repository.insert).toHaveBeenCalledTimes(1);
    expect(repository.insert).toHaveBeenCalledWith({
      userId,
      tokenHash: expectedHash,
      expiresAt: new Date('2026-11-20T10:00:00Z'),
    });
    expect(JSON.stringify(repository.insert.mock.calls)).not.toContain(token);
  });

  it('expires 7 days after issuance', async () => {
    const { service } = setup();

    const { expiresAt } = await service.issue(userId);

    expect(REFRESH_TOKEN_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
    expect(expiresAt).toEqual(new Date('2026-11-20T10:00:00Z'));
  });

  it('propagates a storage failure', async () => {
    const { service, repository } = setup();
    const error = new Error('db down');
    repository.insert.mockRejectedValue(error);

    await expect(service.issue(userId)).rejects.toBe(error);
  });
});

describe('hashRefreshToken', () => {
  it('returns the hex SHA-256 digest of the token', () => {
    expect(hashRefreshToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
