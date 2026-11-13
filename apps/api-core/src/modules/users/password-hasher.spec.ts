import { PasswordHasher } from './password-hasher.js';

describe('PasswordHasher', () => {
  const hasher = new PasswordHasher();

  it('hashes with argon2id and verifies the right password only', async () => {
    const hash = await hasher.hash('motdepasse123');

    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain('motdepasse123');
    await expect(hasher.verify(hash, 'motdepasse123')).resolves.toBe(true);
    await expect(hasher.verify(hash, 'motdepasse124')).resolves.toBe(false);
  });

  it('returns false for a malformed hash', async () => {
    await expect(hasher.verify('not-a-hash', 'motdepasse123')).resolves.toBe(
      false,
    );
  });
});
