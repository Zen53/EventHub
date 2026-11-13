import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { RefreshTokensRepository } from './refresh-tokens.repository.js';

export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const REFRESH_TOKEN_BYTES = 32;

export interface IssuedRefreshToken {
  token: string;
  expiresAt: Date;
}

export const hashRefreshToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

@Injectable()
export class RefreshTokenService {
  constructor(private readonly repository: RefreshTokensRepository) {}

  async issue(userId: string): Promise<IssuedRefreshToken> {
    const token = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    await this.repository.insert({
      userId,
      tokenHash: hashRefreshToken(token),
      expiresAt,
    });
    return { token, expiresAt };
  }
}
