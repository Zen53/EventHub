import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtError, JwtSigner, JwtVerifier } from '@nestjs/authentication';
import type { Env } from '../../core/config/env.schema.js';
import { AppError } from '../../core/errors/app-error.js';
import { TOKEN_ISSUER } from '../../core/security/index.js';
import { RevokedRefreshTokensRepository } from './revoked-refresh-tokens.repository.js';

export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const REFRESH_TOKEN_AUDIENCE = 'eventhub-refresh';
const ALGORITHM = 'HS256';

export interface IssuedRefreshToken {
  token: string;
  jti: string;
  expiresAt: Date;
}

export interface VerifiedRefreshToken {
  userId: string;
  jti: string;
  expiresAt: Date;
}

@Injectable()
export class RefreshTokenService {
  private readonly signer: JwtSigner;
  private readonly verifier: JwtVerifier;

  constructor(
    config: ConfigService<Env, true>,
    private readonly revoked: RevokedRefreshTokensRepository,
  ) {
    const key = config.get('JWT_ACCESS_SECRET', { infer: true });
    this.signer = new JwtSigner({
      key,
      alg: ALGORITHM,
      issuer: TOKEN_ISSUER,
      audience: REFRESH_TOKEN_AUDIENCE,
      ttl: REFRESH_TOKEN_TTL_MS,
    });
    this.verifier = new JwtVerifier({
      key,
      algorithms: [ALGORITHM],
      issuer: TOKEN_ISSUER,
      audience: REFRESH_TOKEN_AUDIENCE,
      required: ['exp', 'iat', 'sub', 'jti'],
    });
  }

  issue(userId: string): IssuedRefreshToken {
    const jti = randomUUID();
    const token = this.signer.sign({ sub: userId, jti });
    const { exp } = decodePayload(token);
    return { token, jti, expiresAt: new Date(exp * 1000) };
  }

  async verify(token: string): Promise<VerifiedRefreshToken> {
    let claims: { sub?: unknown; jti?: unknown; exp?: unknown };
    try {
      claims = await this.verifier.verify(token);
    } catch (error) {
      if (error instanceof JwtError) {
        throw invalidRefreshToken();
      }
      throw error;
    }
    const { sub, jti, exp } = claims;
    if (
      typeof sub !== 'string' ||
      sub === '' ||
      typeof jti !== 'string' ||
      jti === '' ||
      typeof exp !== 'number'
    ) {
      throw invalidRefreshToken();
    }
    return { userId: sub, jti, expiresAt: new Date(exp * 1000) };
  }

  revoke({ jti, expiresAt }: VerifiedRefreshToken): Promise<boolean> {
    return this.revoked.revoke(jti, expiresAt);
  }

  isRevoked(jti: string): Promise<boolean> {
    return this.revoked.isRevoked(jti);
  }
}

const decodePayload = (token: string): { exp: number } =>
  JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()) as {
    exp: number;
  };

const invalidRefreshToken = () =>
  new AppError(
    401,
    'INVALID_REFRESH_TOKEN',
    'Refresh token absent, expiré ou déjà utilisé.',
  );
