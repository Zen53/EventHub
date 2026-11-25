import { describe, expect, it } from 'vitest';
import { resetPasswordBodySchema } from './auth.js';

const body = { token: 'k3J9xQ2', newPassword: 'nouveaumotdepasse456' };

function issuesOf(value: unknown) {
  const result = resetPasswordBodySchema.safeParse(value);
  expect(result.success).toBe(false);
  return (result.error?.issues ?? []).map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

describe('resetPasswordBodySchema', () => {
  it('accepts the contract body', () => {
    expect(resetPasswordBodySchema.parse(body)).toEqual(body);
  });

  it('rejects a missing token and a missing password', () => {
    expect(issuesOf({})).toEqual([
      { path: 'token', message: 'Le jeton est obligatoire.' },
      { path: 'newPassword', message: 'Le mot de passe est obligatoire.' },
    ]);
  });

  it('rejects an empty token', () => {
    expect(issuesOf({ ...body, token: '' })).toEqual([
      { path: 'token', message: 'Le jeton est obligatoire.' },
    ]);
  });

  it('rejects a token longer than 512 characters', () => {
    expect(issuesOf({ ...body, token: 'a'.repeat(513) })).toEqual([
      {
        path: 'token',
        message: 'Le jeton doit contenir au plus 512 caractères.',
      },
    ]);
  });

  it('applies the password rules to the new password', () => {
    expect(issuesOf({ ...body, newPassword: 'court1' })).toEqual([
      {
        path: 'newPassword',
        message: 'Le mot de passe doit contenir au moins 8 caractères.',
      },
    ]);
  });

  it('rejects an unknown field', () => {
    expect(issuesOf({ ...body, email: 'camille@exemple.fr' })).toHaveLength(1);
  });
});
