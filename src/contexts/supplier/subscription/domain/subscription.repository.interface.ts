import { SubscriptionOrmEntity } from '../infrastructure/persistence/subscription.orm-entity';

export interface ISubscriptionRepository {
  findById(id: number): Promise<SubscriptionOrmEntity | null>;
  findBySupplierId(supplierId: number): Promise<SubscriptionOrmEntity | null>;
  findActiveByPlanId(planId: number): Promise<SubscriptionOrmEntity | null>;
  findCancellingExpired(now: Date): Promise<SubscriptionOrmEntity[]>;
  save(input: Partial<SubscriptionOrmEntity>): Promise<SubscriptionOrmEntity>;
}

export const SUBSCRIPTION_REPOSITORY = Symbol('SUBSCRIPTION_REPOSITORY');
