import { describe, expect, it } from 'vitest';
import { changePasswordBodySchema } from './user.js';

const body = {
  currentPassword: 'motdepasse123',
  newPassword: 'nouveaumotdepasse456',
};

function issuesOf(value: unknown) {
  const result = changePasswordBodySchema.safeParse(value);
  expect(result.success).toBe(false);
  return (result.error?.issues ?? []).map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

describe('changePasswordBodySchema', () => {
  it('accepts the contract body', () => {
    expect(changePasswordBodySchema.parse(body)).toEqual(body);
  });

  it('accepts a current password that no longer follows the password rules', () => {
    expect(
      changePasswordBodySchema.parse({ ...body, currentPassword: 'abc' }),
    ).toEqual({ ...body, currentPassword: 'abc' });
  });

  it.each([
    [
      { currentPassword: undefined },
      'currentPassword',
      'Le mot de passe actuel est obligatoire.',
    ],
    [
      { currentPassword: '' },
      'currentPassword',
      'Le mot de passe actuel est obligatoire.',
    ],
    [
      { currentPassword: 'a'.repeat(73) },
      'currentPassword',
      'Le mot de passe actuel doit contenir au plus 72 caractères.',
    ],
    [
      { newPassword: undefined },
      'newPassword',
      'Le mot de passe est obligatoire.',
    ],
    [
      { newPassword: 'abc123' },
      'newPassword',
      'Le mot de passe doit contenir au moins 8 caractères.',
    ],
    [
      { newPassword: `a1${'x'.repeat(71)}` },
      'newPassword',
      'Le mot de passe doit contenir au plus 72 caractères.',
    ],
    [
      { newPassword: '12345678' },
      'newPassword',
      'Le mot de passe doit contenir au moins une lettre.',
    ],
    [
      { newPassword: 'motdepasse' },
      'newPassword',
      'Le mot de passe doit contenir au moins un chiffre.',
    ],
  ])('rejects %j on %s', (patch, path, message) => {
    expect(issuesOf({ ...body, ...patch })).toContainEqual({ path, message });
  });

  it('rejects unknown fields, such as a confirmation meant for the form only', () => {
    const result = changePasswordBodySchema.safeParse({
      ...body,
      confirmPassword: body.newPassword,
    });

    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        code: 'unrecognized_keys',
        path: [],
        keys: ['confirmPassword'],
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
