import { envSchema } from './env.schema.js';

const DATABASE_URL = 'postgres://user:pass@localhost:5432/db';

describe('envSchema', () => {
  it('accepts a valid environment and coerces PORT to a number', () => {
    expect(
      envSchema.parse({ NODE_ENV: 'production', PORT: '8080', DATABASE_URL }),
    ).toEqual({
      NODE_ENV: 'production',
      PORT: 8080,
      DATABASE_URL,
    });
  });

  it('applies defaults when NODE_ENV and PORT are missing', () => {
    expect(envSchema.parse({ DATABASE_URL })).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      DATABASE_URL,
    });
  });

  it.each([
    { NODE_ENV: 'staging' },
    { PORT: 'abc' },
    { PORT: '0' },
    { PORT: '70000' },
  ])('rejects %o', (env) => {
    expect(envSchema.safeParse({ DATABASE_URL, ...env }).success).toBe(false);
  });

  it.each([
    {},
    { DATABASE_URL: '' },
    { DATABASE_URL: 'not-a-url' },
    { DATABASE_URL: 'mysql://user:pass@localhost/db' },
    { DATABASE_URL: 'http://localhost:5432/db' },
  ])('rejects the database URL in %o', (env) => {
    expect(envSchema.safeParse(env).success).toBe(false);
  });

  it('accepts the postgresql:// scheme', () => {
    expect(
      envSchema.safeParse({ DATABASE_URL: 'postgresql://localhost/db' })
        .success,
    ).toBe(true);
  });

  it('does not echo the database URL in validation errors', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'mysql://user:s3cret-value@localhost/db',
    });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error)).not.toContain('s3cret-value');
  });
});
