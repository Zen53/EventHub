import { describe, expect, it } from 'vitest';
import { registerBodySchema } from './auth.js';

const body = {
  email: 'camille@exemple.fr',
  password: 'motdepasse123',
  firstName: 'Camille',
  lastName: 'Durand',
  phone: '+33612345678',
};

function issuesOf(value: unknown) {
  const result = registerBodySchema.safeParse(value);
  expect(result.success).toBe(false);
  return (result.error?.issues ?? []).map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

describe('registerBodySchema', () => {
  it('accepts the contract body', () => {
    expect(registerBodySchema.parse(body)).toEqual(body);
  });

  it('accepts a body without phone', () => {
    const { phone: _phone, ...withoutPhone } = body;

    expect(registerBodySchema.parse(withoutPhone)).toEqual(withoutPhone);
  });

  it('accepts a null phone', () => {
    expect(registerBodySchema.parse({ ...body, phone: null })).toEqual({
      ...body,
      phone: null,
    });
  });

  it('trims and lowercases the email', () => {
    expect(
      registerBodySchema.parse({ ...body, email: ' Camille@Exemple.FR ' })
        .email,
    ).toBe('camille@exemple.fr');
  });

  it.each([
    [{ email: undefined }, 'email', "L'email est obligatoire."],
    [{ email: 'camille' }, 'email', "L'email n'est pas valide."],
    [
      { email: `${'a'.repeat(250)}@b.fr` },
      'email',
      "L'email doit contenir au plus 254 caractères.",
    ],
    [{ password: undefined }, 'password', 'Le mot de passe est obligatoire.'],
    [
      { password: 'abc123' },
      'password',
      'Le mot de passe doit contenir au moins 8 caractères.',
    ],
    [
      { password: `a1${'x'.repeat(71)}` },
      'password',
      'Le mot de passe doit contenir au plus 72 caractères.',
    ],
    [
      { password: '12345678' },
      'password',
      'Le mot de passe doit contenir au moins une lettre.',
    ],
    [
      { password: 'motdepasse' },
      'password',
      'Le mot de passe doit contenir au moins un chiffre.',
    ],
    [{ firstName: undefined }, 'firstName', 'Ce champ est obligatoire.'],
    [
      { firstName: '  ' },
      'firstName',
      'Ce champ doit contenir au moins 1 caractère.',
    ],
    [
      { lastName: 'a'.repeat(51) },
      'lastName',
      'Ce champ doit contenir au plus 50 caractères.',
    ],
    [
      { phone: '0612345678' },
      'phone',
      'Le téléphone doit être au format international, par exemple +33612345678.',
    ],
    [{ phone: 33612345678 }, 'phone', 'Le téléphone doit être une chaîne.'],
  ])('rejects %j on %s', (patch, path, message) => {
    expect(issuesOf({ ...body, ...patch })).toContainEqual({ path, message });
  });

  it('rejects an unknown field', () => {
    expect(issuesOf({ ...body, role: 'admin' })).toEqual([
      { path: '', message: 'Champ inconnu : role.' },
    ]);
  });

  it('rejects a passwordHash sent by the client', () => {
    expect(issuesOf({ ...body, passwordHash: 'x' })).toEqual([
      { path: '', message: 'Champ inconnu : passwordHash.' },
    ]);
  });

  it.each([null, 'camille', []])('rejects a non object body %j', (value) => {
    expect(issuesOf(value)).toEqual([
      { path: '', message: 'Le corps de la requête doit être un objet JSON.' },
    ]);
  });
});
