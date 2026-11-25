import { describe, expect, it } from 'vitest';
import { errorCatalog } from './error-catalog.js';
import { deleteMeBodySchema } from './user.js';

function issuesOf(value: unknown) {
  const result = deleteMeBodySchema.safeParse(value);
  expect(result.success).toBe(false);
  return (result.error?.issues ?? []).map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

describe('deleteMeBodySchema', () => {
  it('accepts the contract body', () => {
    expect(deleteMeBodySchema.parse({ password: 'motdepasse123' })).toEqual({
      password: 'motdepasse123',
    });
  });

  it('accepts a password that no longer follows the password rules', () => {
    expect(deleteMeBodySchema.parse({ password: 'abc' })).toEqual({
      password: 'abc',
    });
  });

  it.each([
    [{}, 'Le mot de passe est obligatoire.'],
    [{ password: '' }, 'Le mot de passe est obligatoire.'],
    [{ password: 42 }, 'Le mot de passe est obligatoire.'],
    [
      { password: 'a'.repeat(73) },
      'Le mot de passe doit contenir au plus 72 caractères.',
    ],
  ])('rejects %j', (value, message) => {
    expect(issuesOf(value)).toContainEqual({ path: 'password', message });
  });

  it('rejects unknown fields', () => {
    const result = deleteMeBodySchema.safeParse({
      password: 'motdepasse123',
      confirm: true,
    });

    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        code: 'unrecognized_keys',
        path: [],
        keys: ['confirm'],
      }),
    ]);
  });

  it.each([null, 'motdepasse123', []])(
    'rejects a non object body %j',
    (value) => {
      expect(issuesOf(value)).toEqual([
        {
          path: '',
          message: 'Le corps de la requête doit être un objet JSON.',
        },
      ]);
    },
  );
});

describe('ACCOUNT_HAS_UPCOMING_EVENTS', () => {
  it('is a 409 of the catalog', () => {
    expect(errorCatalog.ACCOUNT_HAS_UPCOMING_EVENTS.status).toBe(409);
  });
});
