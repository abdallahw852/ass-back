import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { ALLOW_UNVERIFIED_KEY } from '../../decorators/allow-unverified.decorator';

type SessionRequest = FastifyRequest & {
  session?: {
    user?: {
      id: number;
      _id: string;
      email: string;
      role: string;
      verifiedAt: Date | null;
      viewAs?: 'buyer';
    };
  };
};

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      ALLOW_UNVERIFIED_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<SessionRequest>();
    const user = request.session?.user;
    if (!user?.id) {
      throw new UnauthorizedException('Authentication required.');
    }
    return true;
  }
}
