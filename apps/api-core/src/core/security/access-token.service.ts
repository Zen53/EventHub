import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtError, JwtSigner, JwtVerifier } from '@nestjs/authentication';
import type { Env } from '../config/env.schema.js';
import { AppError } from '../errors/app-error.js';
import type { AuthenticatedUser } from './authenticated-user.js';

/** Access token lifetime, fixed by the contract (docs/contrat-user.md). */
export const ACCESS_TOKEN_TTL = '15m';
const ALGORITHM = 'HS256';
const ISSUER = 'eventhub-api';
const AUDIENCE = 'eventhub-api';

/** Signs and verifies the short-lived JWT access tokens sent as `Authorization: Bearer`. */
@Injectable()
export class AccessTokenService {
  private readonly signer: JwtSigner;
  private readonly verifier: JwtVerifier;

  constructor(config: ConfigService<Env, true>) {
    const key = config.get('JWT_ACCESS_SECRET', { infer: true });
    this.signer = new JwtSigner({
      key,
      alg: ALGORITHM,
      issuer: ISSUER,
      audience: AUDIENCE,
      ttl: ACCESS_TOKEN_TTL,
    });
    this.verifier = new JwtVerifier({
      key,
      algorithms: [ALGORITHM],
      issuer: ISSUER,
      audience: AUDIENCE,
      required: ['exp', 'iat', 'sub'],
    });
  }

  sign({ userId }: AuthenticatedUser): string {
    return this.signer.sign({ sub: userId });
  }

  /** Returns the token's identity, or throws `AppError(401, 'UNAUTHORIZED')`. */
  async verify(token: string): Promise<AuthenticatedUser> {
    let sub: unknown;
    try {
      ({ sub } = await this.verifier.verify(token));
    } catch (error) {
      if (error instanceof JwtError) {
        throw invalidToken();
      }
      throw error;
    }
    if (typeof sub !== 'string' || sub === '') {
      throw invalidToken();
    }
    return { userId: sub };
  }
}

const invalidToken = () =>
  new AppError(401, 'UNAUTHORIZED', 'Invalid or expired access token');
