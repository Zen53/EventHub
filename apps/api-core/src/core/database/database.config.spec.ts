import { parseDatabaseConfig } from './database.config.js';

describe('parseDatabaseConfig', () => {
  it('returns the URL when DATABASE_URL is a postgres URL', () => {
    expect(
      parseDatabaseConfig({
        DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
      }),
    ).toEqual({
      url: 'postgres://user:pass@localhost:5432/db',
    });
  });

  it('accepts the postgresql:// scheme', () => {
    expect(
      parseDatabaseConfig({ DATABASE_URL: 'postgresql://localhost/db' }).url,
    ).toBe('postgresql://localhost/db');
  });

  it('rejects a missing DATABASE_URL', () => {
    expect(() => parseDatabaseConfig({})).toThrow(
      /Invalid database configuration[\s\S]*DATABASE_URL/,
    );
  });

  it('rejects an empty DATABASE_URL', () => {
    expect(() => parseDatabaseConfig({ DATABASE_URL: '' })).toThrow(
      /DATABASE_URL/,
    );
  });

  it.each([
    'not-a-url',
    'mysql://user:pass@localhost/db',
    'http://localhost:5432/db',
  ])('rejects %s', (url) => {
    expect(() => parseDatabaseConfig({ DATABASE_URL: url })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('does not leak the URL in the error message', () => {
    const url = 'mysql://user:s3cret-value@localhost/db';
    expect(() => parseDatabaseConfig({ DATABASE_URL: url })).toThrow(
      expect.not.objectContaining({
        message: expect.stringContaining('s3cret-value'),
      }),
    );
  });
});
