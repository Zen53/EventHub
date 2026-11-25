import { describe, expect, it } from 'vitest';
import { forgotPasswordBodySchema } from './auth.js';

function issuesOf(value: unknown) {
  const result = forgotPasswordBodySchema.safeParse(value);
  expect(result.success).toBe(false);
  return (result.error?.issues ?? []).map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

describe('forgotPasswordBodySchema', () => {
  it('accepts the contract body', () => {
    expect(
      forgotPasswordBodySchema.parse({ email: 'camille@exemple.fr' }),
    ).toEqual({ email: 'camille@exemple.fr' });
  });

  it('trims and lowercases the email', () => {
    expect(
      forgotPasswordBodySchema.parse({ email: ' Camille@Exemple.FR ' }).email,
    ).toBe('camille@exemple.fr');
  });

  it('rejects a missing email', () => {
    expect(issuesOf({})).toEqual([
      { path: 'email', message: "L'email est obligatoire." },
    ]);
  });

  it('rejects a malformed email', () => {
    expect(issuesOf({ email: 'camille' })).toEqual([
      { path: 'email', message: "L'email n'est pas valide." },
    ]);
  });

  it('rejects an unknown field', () => {
    const issues = issuesOf({ email: 'camille@exemple.fr', password: 'x' });

    expect(issues).toHaveLength(1);
  });
});
