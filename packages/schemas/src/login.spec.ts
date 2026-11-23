import { describe, expect, it } from 'vitest';
import { loginBodySchema, loginResponseSchema } from './auth.js';

const body = {
  email: 'camille@exemple.fr',
  password: 'motdepasse123',
};

function issuesOf(value: unknown) {
  const result = loginBodySchema.safeParse(value);
  expect(result.success).toBe(false);
  return (result.error?.issues ?? []).map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

describe('loginBodySchema', () => {
  it('accepts the contract body', () => {
    expect(loginBodySchema.parse(body)).toEqual(body);
  });

  it('trims and lowercases the email', () => {
    expect(
      loginBodySchema.parse({ ...body, email: ' Camille@Exemple.FR ' }).email,
    ).toBe('camille@exemple.fr');
  });

  it.each(['abc', '12345678', 'motdepasse', ' '])(
    'accepts the password %j without the creation rules',
    (password) => {
      expect(loginBodySchema.parse({ ...body, password }).password).toBe(
        password,
      );
    },
  );

  it('accepts a password of 72 characters', () => {
    const password = 'x'.repeat(72);

    expect(loginBodySchema.parse({ ...body, password }).password).toBe(
      password,
    );
  });

  it.each([
    [{ email: undefined }, 'email', "L'email est obligatoire."],
    [{ email: 'camille' }, 'email', "L'email n'est pas valide."],
    [{ password: undefined }, 'password', 'Le mot de passe est obligatoire.'],
    [{ password: '' }, 'password', 'Le mot de passe est obligatoire.'],
    [{ password: 12345678 }, 'password', 'Le mot de passe est obligatoire.'],
    [
      { password: 'x'.repeat(73) },
      'password',
      'Le mot de passe doit contenir au plus 72 caractères.',
    ],
  ])('rejects %j on %s', (patch, path, message) => {
    expect(issuesOf({ ...body, ...patch })).toContainEqual({ path, message });
  });

  it('rejects an unknown field with its key', () => {
    const result = loginBodySchema.safeParse({ ...body, rememberMe: true });

    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        code: 'unrecognized_keys',
        path: [],
        keys: ['rememberMe'],
      }),
    ]);
  });

  it.each([null, 'camille', []])('rejects a non object body %j', (value) => {
    expect(issuesOf(value)).toEqual([
      { path: '', message: 'Le corps de la requête doit être un objet JSON.' },
    ]);
  });
});

describe('loginResponseSchema', () => {
  const user = {
    id: 'a1b2c3d4-0000-4000-8000-000000000002',
    email: 'camille@exemple.fr',
    firstName: 'Camille',
    lastName: 'Durand',
    phone: '+33612345678',
    createdAt: '2026-11-13T10:00:00Z',
    updatedAt: '2026-11-13T10:00:00Z',
  };

  it('accepts the contract response', () => {
    const response = { accessToken: 'eyJhbGciOiJIUzI1NiIs', user };

    expect(loginResponseSchema.parse(response)).toEqual(response);
  });

  it('rejects a response without accessToken', () => {
    expect(loginResponseSchema.safeParse({ user }).success).toBe(false);
  });
});
