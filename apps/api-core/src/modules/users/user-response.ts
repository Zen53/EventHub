import type { User } from '@eventhub/schemas';
import type { UserRow } from './users.schema.js';

/** Maps a row to the `User` of the contract: never the password hash, dates in ISO 8601 UTC. */
export function toUserResponse(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    phone: row.phone,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
