import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  ConflictException,
} from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { IdempotencyStore } from './idempotency.store';

@Injectable()
export class IdempotencyGuard implements CanActivate {
  constructor(private readonly store: IdempotencyStore) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<FastifyRequest & { session: { user?: { id: number } } }>();
    const res = context.switchToHttp().getResponse<FastifyReply>();

    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    if (!idempotencyKey) return true;

    const userId = req.session?.user?.id ?? 0;
    const route = `${req.method}:${req.url}`;
    const requestHash = this.store.hash(req.body);

    const existing = await this.store.get(idempotencyKey);

    if (existing) {
      if (existing.request_hash !== requestHash) {
        throw new ConflictException(
          'Idempotency key already used with different request body.',
        );
      }
      if (existing.response) {
        res.status(200).send(existing.response);
        return false;
      }
      // Key seen but no response yet — in-flight, let it proceed
      return true;
    }

    await this.store.set(idempotencyKey, userId, route, requestHash, null);
    return true;
  }
}
