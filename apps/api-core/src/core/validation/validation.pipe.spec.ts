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

    await expect(
      pipe.transform(body, { type: 'body', schema }),
    ).resolves.toEqual(body);
  });

  it('throws a 400 VALIDATION_ERROR with one detail per field, paths joined by dots', async () => {
    const error = await pipe
      .transform(
        { email: 'nope', profile: { tags: [1] } },
        { type: 'body', schema },
      )
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    expect((error as AppError).details).toEqual([
      { field: 'email', message: expect.any(String) },
      { field: 'profile.tags.0', message: expect.any(String) },
    ]);
  });

  it('names the parameter when the schema validates a single value', async () => {
    const error = await pipe
      .transform('nope', { type: 'param', data: 'id', schema: z.uuid() })
      .catch((e: unknown) => e);

    expect((error as AppError).details).toEqual([
      { field: 'id', message: expect.any(String) },
    ]);
  });

  it('prefixes nested paths with the parameter name', async () => {
    const error = await pipe
      .transform(
        { tags: [1] },
        { type: 'body', data: 'profile', schema: schema.shape.profile },
      )
      .catch((e: unknown) => e);

    expect((error as AppError).details).toEqual([
      { field: 'profile.tags.0', message: expect.any(String) },
    ]);
  });

  describe('unknown fields', () => {
    const strict = z.strictObject({
      email: z.email(),
      profile: z.strictObject({ name: z.string() }),
    });
    const valid = { email: 'a@b.co', profile: { name: 'Camille' } };
    const unknown = "Ce champ n'est pas autorisé.";

    async function detailsOf(value: unknown, data?: string) {
      const error = await pipe
        .transform(value, { type: 'body', data, schema: strict })
        .catch((e: unknown) => e);
      expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
      return (error as AppError).details;
    }

    it('names an unknown key at the root', async () => {
      await expect(detailsOf({ ...valid, role: 'x' })).resolves.toEqual([
        { field: 'role', message: unknown },
      ]);
    });

    it('reports one detail per unknown key, in key order', async () => {
      await expect(detailsOf({ ...valid, role: 'x', id: 1 })).resolves.toEqual([
        { field: 'role', message: unknown },
        { field: 'id', message: unknown },
      ]);
    });

    it('joins the object path and the key of a nested unknown key', async () => {
      await expect(
        detailsOf({ ...valid, profile: { name: 'Camille', extra: true } }),
      ).resolves.toEqual([{ field: 'profile.extra', message: unknown }]);
    });

    it('prefixes unknown keys with the parameter name', async () => {
      await expect(
        detailsOf({ ...valid, role: 'x' }, 'query'),
      ).resolves.toEqual([{ field: 'query.role', message: unknown }]);
    });

    it('mixes unknown keys and invalid fields', async () => {
      await expect(
        detailsOf({ ...valid, email: 'nope', role: 'x' }),
      ).resolves.toEqual([
        { field: 'email', message: expect.any(String) },
        { field: 'role', message: unknown },
      ]);
    });
  });

  it('leaves parameters without a schema untouched', async () => {
    await expect(pipe.transform('raw', { type: 'query' })).resolves.toBe('raw');
  });
});
