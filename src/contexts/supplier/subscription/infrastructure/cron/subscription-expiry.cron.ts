import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SUBSCRIPTION_REPOSITORY } from '../../domain/subscription.repository.interface';
import type { ISubscriptionRepository } from '../../domain/subscription.repository.interface';
import { PLAN_REPOSITORY } from '../../domain/plan.repository.interface';
import type { IPlanRepository } from '../../domain/plan.repository.interface';

@Injectable()
export class SubscriptionExpiryCron {
  private readonly logger = new Logger(SubscriptionExpiryCron.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepository: ISubscriptionRepository,
    @Inject(PLAN_REPOSITORY)
    private readonly planRepository: IPlanRepository,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async revertExpiredCancellations(): Promise<void> {
    const now = new Date();
    const expired =
      await this.subscriptionRepository.findCancellingExpired(now);
    if (!expired.length) return;

    const defaultPlan = await this.planRepository.findDefault();
    if (!defaultPlan) {
      this.logger.error(
        'No default plan configured — cannot revert cancelled subscriptions',
      );
      return;
    }

    const periodEnd = new Date(now);
    periodEnd.setFullYear(periodEnd.getFullYear() + 100);

    for (const sub of expired) {
      try {
        await this.subscriptionRepository.save({
          ...sub,
          planId: defaultPlan.id,
          cancelAtPeriodEnd: false,
          status: 'active',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        });
        this.logger.log(`Reverted subscription ${sub._id} to default plan`);
      } catch (err) {
        this.logger.error(`Failed to revert subscription ${sub._id}`, err);
      }
    }
  }
}
