import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppError } from '../errors/app-error.js';
import { AccessTokenService } from './access-token.service.js';
import type { AuthenticatedRequest } from './authenticated-user.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { TokenRevocations } from './token-revocations.js';

const BEARER = /^Bearer ([A-Za-z0-9\-_.]+)$/i;

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessTokens: AccessTokenService,
    private readonly revocations: TokenRevocations,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = BEARER.exec(request.headers.authorization ?? '')?.[1];
    if (!token) {
      throw new AppError('UNAUTHORIZED');
    }
    const { userId, issuedAt } = await this.accessTokens.verify(token);
    if (await this.revocations.isRevoked(userId, issuedAt)) {
      throw new AppError('UNAUTHORIZED');
    }
    request.user = { userId };
    return true;
  }
}
