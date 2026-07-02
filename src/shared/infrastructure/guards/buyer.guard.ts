import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

type SessionRequest = FastifyRequest & {
  session: { user: { id: number; role: string; viewAs?: 'buyer' } };
};

@Injectable()
export class BuyerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    const { role, viewAs } = request.session?.user ?? {};
    const isBuyer =
      role === 'buyer' ||
      role === 'user' ||
      (role === 'supplier' && viewAs === 'buyer');
    if (!isBuyer) {
      throw new ForbiddenException('Only buyers can perform this action.');
    }
    return true;
  }
}
