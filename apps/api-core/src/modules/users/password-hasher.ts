import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

/** Hashes passwords with argon2id, the default algorithm of @node-rs/argon2. */
@Injectable()
export class PasswordHasher {
  hash(password: string): Promise<string> {
    return hash(password);
  }

  /** Returns false, instead of throwing, when the stored hash is malformed. */
  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }
}
