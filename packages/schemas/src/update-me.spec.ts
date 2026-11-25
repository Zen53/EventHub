import { describe, expect, it } from 'vitest';
import { updateMeBodySchema } from './user.js';

function issuesOf(value: unknown) {
  const result = updateMeBodySchema.safeParse(value);
  expect(result.success).toBe(false);
  return (result.error?.issues ?? []).map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

describe('updateMeBodySchema', () => {
  it('accepts the contract body', () => {
    const body = { firstName: 'Camille', phone: null };

    expect(updateMeBodySchema.parse(body)).toEqual(body);
  });

  it.each([
    { firstName: 'Camille' },
    { lastName: 'Durand' },
    { phone: '+33612345678' },
    { phone: null },
    { firstName: 'Camille', lastName: 'Durand', phone: '+33612345678' },
  ])('accepts the subset %j without currentPassword', (body) => {
    expect(updateMeBodySchema.parse(body)).toEqual(body);
  });

  it('accepts an email change with currentPassword', () => {
    const body = {
      email: 'camille.durand@exemple.fr',
      currentPassword: 'motdepasse123',
    };

    expect(updateMeBodySchema.parse(body)).toEqual(body);
  });

  it('accepts an email change along with other fields', () => {
    const body = {
      email: 'camille.durand@exemple.fr',
      firstName: 'Camille',
      currentPassword: 'motdepasse123',
    };

    expect(updateMeBodySchema.parse(body)).toEqual(body);
  });

  it('trims and lowercases the email and trims the names', () => {
    expect(
      updateMeBodySchema.parse({
        email: ' Camille@Exemple.FR ',
        firstName: '  Camille ',
        currentPassword: 'motdepasse123',
      }),
    ).toEqual({
      email: 'camille@exemple.fr',
      firstName: 'Camille',
      currentPassword: 'motdepasse123',
    });
  });

  it('does not trim currentPassword', () => {
    expect(
      updateMeBodySchema.parse({
        email: 'camille@exemple.fr',
        currentPassword: ' motdepasse123 ',
      }).currentPassword,
    ).toBe(' motdepasse123 ');
  });

  it('requires currentPassword when email is sent', () => {
    expect(issuesOf({ email: 'camille.durand@exemple.fr' })).toEqual([
      {
        path: 'currentPassword',
        message: "Le mot de passe actuel est obligatoire pour changer l'email.",
      },
    ]);
  });

  it('reports the missing currentPassword along with an invalid email', () => {
    expect(issuesOf({ email: 'camille' })).toEqual([
      { path: 'email', message: "L'email n'est pas valide." },
      {
        path: 'currentPassword',
        message: "Le mot de passe actuel est obligatoire pour changer l'email.",
      },
    ]);
  });

  it.each([
    { currentPassword: 'motdepasse123' },
    { firstName: 'Camille', currentPassword: 'motdepasse123' },
    { firstName: 'Camille', currentPassword: '' },
    { currentPassword: '' },
    { firstName: 'Camille', currentPassword: 'x'.repeat(73) },
  ])(
    'rejects currentPassword without email in %j, with a single message',
    (body) => {
      expect(issuesOf(body)).toEqual([
        {
          path: 'currentPassword',
          message:
            "Le mot de passe actuel ne s'envoie que pour changer l'email.",
        },
      ]);
    },
  );

  it('reports only the type error for a non string currentPassword without email', () => {
    expect(issuesOf({ firstName: 'Camille', currentPassword: 42 })).toEqual([
      {
        path: 'currentPassword',
        message: 'Le mot de passe actuel doit être une chaîne.',
      },
    ]);
  });

  it('rejects an empty body', () => {
    expect(issuesOf({})).toEqual([
      { path: '', message: 'Au moins un champ doit être modifié.' },
    ]);
  });

  it.each([
    [{ email: 'camille' }, 'email', "L'email n'est pas valide."],
    [
      { email: `${'a'.repeat(250)}@b.fr` },
      'email',
      "L'email doit contenir au plus 254 caractères.",
    ],
    [{ email: null }, 'email', "L'email est obligatoire."],
    [
      { firstName: '  ' },
      'firstName',
      'Ce champ doit contenir au moins 1 caractère.',
    ],
    [{ firstName: null }, 'firstName', 'Ce champ est obligatoire.'],
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
    [
      { email: 'camille@exemple.fr', currentPassword: '' },
      'currentPassword',
      'Le mot de passe actuel est obligatoire.',
    ],
    [
      { email: 'camille@exemple.fr', currentPassword: 'x'.repeat(73) },
      'currentPassword',
      'Le mot de passe actuel doit contenir au plus 72 caractères.',
    ],
    [
      { email: 'camille@exemple.fr', currentPassword: 12345678 },
      'currentPassword',
      'Le mot de passe actuel doit être une chaîne.',
    ],
  ])('rejects %j on %s', (body, path, message) => {
    expect(issuesOf(body)).toContainEqual({ path, message });
  });

  it.each([
    [{ id: 'a1b2c3d4-0000-4000-8000-000000000002' }, ['id']],
    [{ createdAt: '2026-11-13T10:00:00Z' }, ['createdAt']],
    [{ updatedAt: '2026-11-13T10:00:00Z' }, ['updatedAt']],
    [{ password: 'motdepasse123' }, ['password']],
    [{ firstName: 'Camille', passwordHash: 'x' }, ['passwordHash']],
  ])('rejects the field %j with only its key', (body, keys) => {
    expect(updateMeBodySchema.safeParse(body).error?.issues).toEqual([
      expect.objectContaining({ code: 'unrecognized_keys', path: [], keys }),
    ]);
  });

  it.each([null, 'camille', []])('rejects a non object body %j', (value) => {
    expect(issuesOf(value)).toEqual([
      { path: '', message: 'Le corps de la requête doit être un objet JSON.' },
    ]);
  });
});
