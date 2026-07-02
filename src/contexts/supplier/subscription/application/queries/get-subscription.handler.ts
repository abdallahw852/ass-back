import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetSubscriptionQuery } from './get-subscription.query';
import { SUBSCRIPTION_REPOSITORY } from '../../domain/subscription.repository.interface';
import type { ISubscriptionRepository } from '../../domain/subscription.repository.interface';
import { PLAN_REPOSITORY } from '../../domain/plan.repository.interface';
import type { IPlanRepository } from '../../domain/plan.repository.interface';
import { SUPPLIER_REPOSITORY } from '../../../identity/domain/repositories/supplier.repository.interface';
import type { ISupplierRepository } from '../../../identity/domain/repositories/supplier.repository.interface';

@QueryHandler(GetSubscriptionQuery)
export class GetSubscriptionHandler implements IQueryHandler<
  GetSubscriptionQuery,
  Record<string, unknown> | null
> {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepository: ISubscriptionRepository,
    @Inject(PLAN_REPOSITORY)
    private readonly planRepository: IPlanRepository,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepository,
  ) {}

  async execute(
    query: GetSubscriptionQuery,
  ): Promise<Record<string, unknown> | null> {
    const supplier = await this.supplierRepository.findByUserId(query.userId);
    if (!supplier) throw new NotFoundException('Supplier profile not found.');

    const subscription = await this.subscriptionRepository.findBySupplierId(
      supplier.id,
    );
    if (!subscription) return null;

    const plan = await this.planRepository.findById(subscription.planId);
    return { ...subscription, plan } as unknown as Record<string, unknown>;
  }
}
