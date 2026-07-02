import { ForbiddenException } from '@nestjs/common';

export class QuotaExceededException extends ForbiddenException {
  constructor(key: string, limit: number) {
    super(`Quota exceeded for '${key}': limit is ${limit}.`);
  }
}
