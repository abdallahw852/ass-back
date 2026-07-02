import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

type SessionRequest = FastifyRequest & {
  session?: { user?: { id: number; role: string } };
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<SessionRequest>();
    const user = request.session?.user;

    if (!user?.id) throw new UnauthorizedException('Authentication required.');
    if (!required.includes(user.role.toLowerCase())) {
      throw new ForbiddenException(
        `One of the following roles required: ${required.join(', ')}.`,
      );
    }
    return true;
  }
}
