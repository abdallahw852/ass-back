import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { ALLOW_UNVERIFIED_KEY } from '../../decorators/allow-unverified.decorator';
import { AuthUserNotVerifiedException } from '../../../contexts/auth/domain/auth.exceptions';

type SessionRequest = FastifyRequest & {
  session?: { user?: { id?: number; verifiedAt?: Date | null } };
};

@Injectable()
export class VerifiedUserGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isAllowed = this.reflector.getAllAndOverride<boolean>(
      ALLOW_UNVERIFIED_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isAllowed) return true;

    const request = context.switchToHttp().getRequest<SessionRequest>();
    const user = request.session?.user;

    // No user in session — let SessionAuthGuard handle the 401
    if (!user?.id) return true;

    if (!user.verifiedAt) {
      throw new AuthUserNotVerifiedException();
    }

    return true;
  }
}
