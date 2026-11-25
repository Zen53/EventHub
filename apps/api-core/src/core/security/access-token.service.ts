import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtError, JwtSigner, JwtVerifier } from '@nestjs/authentication';
import type { Env } from '../config/env.schema.js';
import { AppError } from '../errors/app-error.js';
import type { AuthenticatedUser } from './authenticated-user.js';

export const ACCESS_TOKEN_TTL = '15m';
const ALGORITHM = 'HS256';
export const TOKEN_ISSUER = 'eventhub-api';
const AUDIENCE = 'eventhub-api';

export interface VerifiedAccessToken extends AuthenticatedUser {
  issuedAt: Date;
}

@Injectable()
export class AccessTokenService {
  private readonly signer: JwtSigner;
  private readonly verifier: JwtVerifier;

  constructor(config: ConfigService<Env, true>) {
    const key = config.get('JWT_ACCESS_SECRET', { infer: true });
    this.signer = new JwtSigner({
      key,
      alg: ALGORITHM,
      issuer: TOKEN_ISSUER,
      audience: AUDIENCE,
      ttl: ACCESS_TOKEN_TTL,
    });
    this.verifier = new JwtVerifier({
      key,
      algorithms: [ALGORITHM],
      issuer: TOKEN_ISSUER,
      audience: AUDIENCE,
      required: ['exp', 'iat', 'sub'],
    });
  }

  sign({ userId }: AuthenticatedUser): string {
    return this.signer.sign({ sub: userId });
  }

  async verify(token: string): Promise<VerifiedAccessToken> {
    let sub: unknown;
    let iat: unknown;
    try {
      ({ sub, iat } = await this.verifier.verify(token));
    } catch (error) {
      if (error instanceof JwtError) {
        throw invalidToken();
      }
      throw error;
    }
    if (typeof sub !== 'string' || sub === '' || typeof iat !== 'number') {
      throw invalidToken();
    }
    return { userId: sub, issuedAt: new Date(iat * 1000) };
  }
}

const invalidToken = () => new AppError('UNAUTHORIZED');
