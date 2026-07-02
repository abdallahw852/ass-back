import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

type SessionRequest = FastifyRequest & {
  session?: { user?: { id: number; role: string } };
};

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    const user = request.session?.user;

    if (!user?.id) {
      throw new UnauthorizedException('Authentication required.');
    }

    if (user.role !== 'admin') {
      throw new ForbiddenException('Admin access required.');
    }

    return true;
  }
}
