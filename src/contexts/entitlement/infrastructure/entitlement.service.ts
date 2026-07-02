import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../../../shared/infrastructure/services/redis.service';
import { FEATURE_CATALOG } from '../domain/feature-catalog';
import type { IEntitlementService } from '../domain/entitlement.service.interface';
import { PlanOrmEntity } from '../../supplier/subscription/infrastructure/persistence/plan.orm-entity';
import { SubscriptionOrmEntity } from '../../supplier/subscription/infrastructure/persistence/subscription.orm-entity';

const CACHE_PREFIX = 'entitlements:supplier:';
const CACHE_TTL = 300;

@Injectable()
export class EntitlementService implements IEntitlementService {
  constructor(
    @InjectRepository(PlanOrmEntity, 'write')
    private readonly planRepo: Repository<PlanOrmEntity>,
    @InjectRepository(SubscriptionOrmEntity, 'write')
    private readonly subscriptionRepo: Repository<SubscriptionOrmEntity>,
    @Inject(RedisService)
    private readonly redisService: RedisService,
  ) {}

  async getEntitlements(
    supplierId: number,
  ): Promise<Record<string, boolean | number>> {
    const cacheKey = `${CACHE_PREFIX}${supplierId}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as Record<string, boolean | number>;
    }

    const plan = await this.resolvePlan(supplierId);
    const catalogDefaults = this.buildCatalogDefaults();
    const entitlements: Record<string, boolean | number> = {
      ...catalogDefaults,
      ...(plan?.entitlements ?? {}),
    };

    await this.redisService.set(
      cacheKey,
      JSON.stringify(entitlements),
      CACHE_TTL,
    );
    return entitlements;
  }

  async can(supplierId: number, key: string): Promise<boolean> {
    const entitlements = await this.getEntitlements(supplierId);
    const value = entitlements[key];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    return false;
  }

  async getLimit(supplierId: number, key: string): Promise<number> {
    const entitlements = await this.getEntitlements(supplierId);
    const value = entitlements[key];
    if (typeof value === 'number') return value;
    return -1;
  }

  async invalidateBySupplier(supplierId: number): Promise<void> {
    await this.redisService.delete(`${CACHE_PREFIX}${supplierId}`);
  }

  async invalidateAll(): Promise<void> {
    // RedisService exposes the ioredis client indirectly; scan for matching keys
    const client = (
      this.redisService as unknown as { client: import('ioredis').Redis }
    ).client;
    if (client) {
      const keys = await client.keys(`${CACHE_PREFIX}*`);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    }
  }

  private async resolvePlan(supplierId: number): Promise<PlanOrmEntity | null> {
    const subscription = await this.subscriptionRepo.findOne({
      where: { supplierId, status: 'active' },
    });

    if (subscription) {
      const plan = await this.planRepo.findOne({
        where: { id: subscription.planId },
      });
      if (plan) return plan;
    }

    return this.planRepo.findOne({ where: { isDefault: true } });
  }

  private buildCatalogDefaults(): Record<string, boolean | number> {
    const defaults: Record<string, boolean | number> = {};
    for (const [key, def] of Object.entries(FEATURE_CATALOG)) {
      defaults[key] = def.default;
    }
    return defaults;
  }
}
