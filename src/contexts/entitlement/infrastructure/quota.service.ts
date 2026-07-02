import { Injectable } from '@nestjs/common';
import { QuotaExceededException } from '../domain/entitlement.exceptions';

@Injectable()
export class QuotaService {
  assertWithinQuota(
    supplierId: number,
    key: string,
    currentCount: number,
    limit: number,
  ): void {
    if (limit !== -1 && currentCount >= limit) {
      throw new QuotaExceededException(key, limit);
    }
  }
}
