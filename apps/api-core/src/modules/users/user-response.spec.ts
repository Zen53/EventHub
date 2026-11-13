import { userSchema } from '@eventhub/schemas';
import { toUserResponse } from './user-response.js';
import type { UserRow } from './users.schema.js';

const row: UserRow = {
  id: 'a1b2c3d4-0000-4000-8000-000000000002',
  email: 'camille@exemple.fr',
  firstName: 'Camille',
  lastName: 'Durand',
  phone: null,
  passwordHash: '$argon2id$secret',
  createdAt: new Date('2026-11-13T10:00:00Z'),
  updatedAt: new Date('2026-11-14T08:30:00Z'),
};

describe('toUserResponse', () => {
  it('returns the contract User, without the password hash and with ISO dates', () => {
    const user = toUserResponse(row);

    expect(user).toEqual({
      id: row.id,
      email: 'camille@exemple.fr',
      firstName: 'Camille',
      lastName: 'Durand',
      phone: null,
      createdAt: '2026-11-13T10:00:00.000Z',
      updatedAt: '2026-11-14T08:30:00.000Z',
    });
    expect(user).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(user)).not.toContain('argon2');
    expect(userSchema.safeParse(user).success).toBe(true);
  });

  it('keeps the phone when there is one', () => {
    expect(toUserResponse({ ...row, phone: '+33612345678' }).phone).toBe(
      '+33612345678',
    );
  });
});
