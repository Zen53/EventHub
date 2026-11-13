import { envSchema } from './env.schema.js';

describe('envSchema', () => {
  it('accepts a valid environment and coerces PORT to a number', () => {
    expect(envSchema.parse({ NODE_ENV: 'production', PORT: '8080' })).toEqual({
      NODE_ENV: 'production',
      PORT: 8080,
    });
  });

  it('applies defaults when NODE_ENV and PORT are missing', () => {
    expect(envSchema.parse({})).toEqual({ NODE_ENV: 'development', PORT: 3000 });
  });

  it.each([{ NODE_ENV: 'staging' }, { PORT: 'abc' }, { PORT: '0' }, { PORT: '70000' }])(
    'rejects %o',
    (env) => {
      expect(envSchema.safeParse(env).success).toBe(false);
    },
  );
});
