import { describe, expect, it } from 'vitest';
import {
  emailSchema,
  nameSchema,
  passwordSchema,
  phoneSchema,
  userSchema,
} from './user.js';

describe('user schemas', () => {
  describe('emailSchema', () => {
    it('accepts a valid email and lowercases it', () => {
      expect(emailSchema.parse(' Camille@Exemple.FR ')).toBe(
        'camille@exemple.fr',
      );
    });

    it.each(['', 'camille', 'camille@', '@exemple.fr', 42])(
      'rejects %j',
      (value) => {
        expect(emailSchema.safeParse(value).success).toBe(false);
      },
    );

    it('rejects more than 254 characters', () => {
      const email = `${'a'.repeat(64)}@${`${'b'.repeat(47)}.`.repeat(4)}fr`;
      expect(email.length).toBeGreaterThan(254);
      const result = emailSchema.safeParse(email);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe(
        "L'email doit contenir au plus 254 caractères.",
      );
    });
  });

  describe('nameSchema', () => {
    it.each(['C', 'Camille', 'a'.repeat(50)])('accepts %j', (value) => {
      expect(nameSchema.safeParse(value).success).toBe(true);
    });

    it.each(['', '   ', 'a'.repeat(51), null])('rejects %j', (value) => {
      expect(nameSchema.safeParse(value).success).toBe(false);
    });
  });

  describe('phoneSchema', () => {
    it.each(['+33612345678', '+12025550123'])('accepts %j', (value) => {
      expect(phoneSchema.safeParse(value).success).toBe(true);
    });

    it.each([
      '0612345678',
      '+0612345678',
      '+33 6 12 34 56 78',
      '+1234567890123456',
    ])('rejects %j', (value) => {
      expect(phoneSchema.safeParse(value).success).toBe(false);
    });
  });

  describe('passwordSchema', () => {
    it.each(['motdepasse123', 'abcdefg1', `a1${'x'.repeat(70)}`])(
      'accepts %j',
      (value) => {
        expect(passwordSchema.safeParse(value).success).toBe(true);
      },
    );

    it.each([
      ['abc123', 'Le mot de passe doit contenir au moins 8 caractères.'],
      [
        `a1${'x'.repeat(71)}`,
        'Le mot de passe doit contenir au plus 72 caractères.',
      ],
      ['12345678', 'Le mot de passe doit contenir au moins une lettre.'],
      ['motdepasse', 'Le mot de passe doit contenir au moins un chiffre.'],
    ])('rejects %j', (value, message) => {
      const result = passwordSchema.safeParse(value);
      expect(result.success).toBe(false);
      expect(result.error?.issues.map((issue) => issue.message)).toContain(
        message,
      );
    });
  });

  describe('userSchema', () => {
    const user = {
      id: 'a1b2c3d4-0000-4000-8000-000000000002',
      email: 'camille@exemple.fr',
      firstName: 'Camille',
      lastName: 'Durand',
      phone: null,
      createdAt: '2026-11-13T10:00:00Z',
      updatedAt: '2026-11-13T10:00:00.000Z',
    };

    it('accepts the contract User', () => {
      expect(userSchema.safeParse(user).success).toBe(true);
    });

    it('drops an unknown passwordHash field', () => {
      expect(
        userSchema.parse({ ...user, passwordHash: 'x' }),
      ).not.toHaveProperty('passwordHash');
    });

    it.each([
      { id: 'not-a-uuid' },
      { createdAt: '13/11/2026' },
      { updatedAt: '2026-11-13T10:00:00+02:00' },
      { phone: undefined },
    ])('rejects %j', (patch) => {
      expect(userSchema.safeParse({ ...user, ...patch }).success).toBe(false);
    });
  });
});
