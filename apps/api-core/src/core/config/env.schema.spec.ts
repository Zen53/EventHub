import { envSchema } from './env.schema.js';

const DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
const JWT_ACCESS_SECRET = 'test-only-access-secret-of-32-chars!';
const required = { DATABASE_URL, JWT_ACCESS_SECRET };

describe('envSchema', () => {
  it('accepts a valid environment and coerces PORT to a number', () => {
    expect(
      envSchema.parse({ NODE_ENV: 'production', PORT: '8080', ...required }),
    ).toEqual({
      NODE_ENV: 'production',
      PORT: 8080,
      ...required,
    });
  });

  it('applies defaults when NODE_ENV and PORT are missing', () => {
    expect(envSchema.parse(required)).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      ...required,
    });
  });

  it.each([
    { NODE_ENV: 'staging' },
    { PORT: 'abc' },
    { PORT: '0' },
    { PORT: '70000' },
  ])('rejects %o', (env) => {
    expect(envSchema.safeParse({ ...required, ...env }).success).toBe(false);
  });

  it.each([
    { DATABASE_URL: undefined },
    { DATABASE_URL: '' },
    { DATABASE_URL: 'not-a-url' },
    { DATABASE_URL: 'mysql://user:pass@localhost/db' },
    { DATABASE_URL: 'http://localhost:5432/db' },
  ])('rejects the database URL in %o', (env) => {
    expect(envSchema.safeParse({ ...required, ...env }).success).toBe(false);
  });

  it.each([
    { JWT_ACCESS_SECRET: undefined },
    { JWT_ACCESS_SECRET: '' },
    { JWT_ACCESS_SECRET: 'x'.repeat(31) },
    { JWT_ACCESS_SECRET: 'change-me-to-a-random-secret-of-at-least-32-chars' },
  ])('rejects the access token secret in %o', (env) => {
    expect(envSchema.safeParse({ ...required, ...env }).success).toBe(false);
  });

  it('accepts a 32-character access token secret', () => {
    expect(
      envSchema.safeParse({ ...required, JWT_ACCESS_SECRET: 'x'.repeat(32) })
        .success,
    ).toBe(true);
  });

  it('accepts the postgresql:// scheme', () => {
    expect(
      envSchema.safeParse({
        ...required,
        DATABASE_URL: 'postgresql://localhost/db',
      }).success,
    ).toBe(true);
  });

  it('does not echo the database URL in validation errors', () => {
    const result = envSchema.safeParse({
      ...required,
      DATABASE_URL: 'mysql://user:s3cret-value@localhost/db',
    });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error)).not.toContain('s3cret-value');
  });
});
