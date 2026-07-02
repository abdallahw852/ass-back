import {
  BadGatewayException,
  ConflictException,
  Inject,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeletePlanCommand } from '../delete-plan.command';
import { PLAN_REPOSITORY } from '../../../domain/plan.repository.interface';
import type { IPlanRepository } from '../../../domain/plan.repository.interface';
import { SUBSCRIPTION_REPOSITORY } from '../../../domain/subscription.repository.interface';
import type { ISubscriptionRepository } from '../../../domain/subscription.repository.interface';
import { PAYMENT_GATEWAY_PORT } from '../../ports/payment-gateway.port';
import type { PaymentGatewayPort } from '../../ports/payment-gateway.port';
import { ENTITLEMENT_SERVICE } from '../../../../../entitlement/domain/entitlement.service.interface';
import type { IEntitlementService } from '../../../../../entitlement/domain/entitlement.service.interface';

@CommandHandler(DeletePlanCommand)
export class DeletePlanHandler implements ICommandHandler<DeletePlanCommand> {
  private readonly logger = new Logger(DeletePlanHandler.name);

  constructor(
    @Inject(PLAN_REPOSITORY)
    private readonly planRepository: IPlanRepository,
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepository: ISubscriptionRepository,
    @Inject(PAYMENT_GATEWAY_PORT)
    private readonly paymentGateway: PaymentGatewayPort,
    @Inject(ENTITLEMENT_SERVICE)
    private readonly entitlementService: IEntitlementService,
  ) {}

  async execute(command: DeletePlanCommand): Promise<{ success: true }> {
    const plan = await this.planRepository.findByPublicId(command.publicId);
    if (!plan)
      throw new NotFoundException(`Plan '${command.publicId}' not found.`);

    const activeSubscription =
      await this.subscriptionRepository.findActiveByPlanId(plan.id);
    if (activeSubscription) {
      throw new ConflictException(
        'Plan has active subscribers and cannot be deleted.',
      );
    }

    if (plan.platformPlanId && plan.isActive) {
      try {
        await this.paymentGateway.deactivateSubscriptionPlan(
          plan.platformPlanId,
        );
      } catch (err) {
        this.logger.error(
          `Paymob deactivate failed: ${(err as Error).message}`,
        );
        throw new BadGatewayException(
          'Failed to deactivate the payment provider plan.',
        );
      }
    }

    await this.planRepository.deactivate(plan.id);
    await this.entitlementService.invalidateAll();
    return { success: true };
  }
}
