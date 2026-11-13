import { z } from 'zod';
import { AppError } from '../errors/app-error.js';
import { createValidationPipe } from './validation.pipe.js';

const schema = z.object({
  email: z.email(),
  profile: z.object({ tags: z.array(z.string()) }),
});

describe('validation pipe', () => {
  const pipe = createValidationPipe();

  it('returns the parsed value of a valid body', async () => {
    const body = { email: 'a@b.co', profile: { tags: ['x'] } };

    await expect(pipe.transform(body, { type: 'body', schema })).resolves.toEqual(body);
  });

  it('throws a 400 VALIDATION_ERROR with one detail per field, paths joined by dots', async () => {
    const error = await pipe
      .transform({ email: 'nope', profile: { tags: [1] } }, { type: 'body', schema })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    expect((error as AppError).details).toEqual([
      { field: 'email', message: expect.any(String) },
      { field: 'profile.tags.0', message: expect.any(String) },
    ]);
  });

  it('leaves parameters without a schema untouched', async () => {
    await expect(pipe.transform('raw', { type: 'query' })).resolves.toBe('raw');
  });
});
