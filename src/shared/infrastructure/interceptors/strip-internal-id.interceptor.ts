import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Recursively removes the `id` field (internal auto-increment PK) from every
 * object in the response tree. Public identifiers use `_id` (UUID) and are
 * left untouched.
 */
function stripId(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripId);
  }
  if (value instanceof Date) {
    return value;
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => k !== 'id')
        .map(([k, v]) => [k, stripId(v)]),
    );
  }
  return value;
}

@Injectable()
export class StripInternalIdInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map(stripId));
  }
}
