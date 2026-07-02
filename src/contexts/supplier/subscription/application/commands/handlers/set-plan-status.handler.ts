import {
  BadGatewayException,
  Inject,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SetPlanStatusCommand } from '../set-plan-status.command';
import { PLAN_REPOSITORY } from '../../../domain/plan.repository.interface';
import type { IPlanRepository } from '../../../domain/plan.repository.interface';
import { PlanOrmEntity } from '../../../infrastructure/persistence/plan.orm-entity';
import { PAYMENT_GATEWAY_PORT } from '../../ports/payment-gateway.port';
import type { PaymentGatewayPort } from '../../ports/payment-gateway.port';
import { ENTITLEMENT_SERVICE } from '../../../../../entitlement/domain/entitlement.service.interface';
import type { IEntitlementService } from '../../../../../entitlement/domain/entitlement.service.interface';

@CommandHandler(SetPlanStatusCommand)
export class SetPlanStatusHandler implements ICommandHandler<
  SetPlanStatusCommand,
  PlanOrmEntity
> {
  private readonly logger = new Logger(SetPlanStatusHandler.name);

  constructor(
    @Inject(PLAN_REPOSITORY)
    private readonly planRepository: IPlanRepository,
    @Inject(PAYMENT_GATEWAY_PORT)
    private readonly paymentGateway: PaymentGatewayPort,
    @Inject(ENTITLEMENT_SERVICE)
    private readonly entitlementService: IEntitlementService,
  ) {}

  async execute(command: SetPlanStatusCommand): Promise<PlanOrmEntity> {
    const plan = await this.planRepository.findByPublicId(command.publicId);
    if (!plan)
      throw new NotFoundException(`Plan '${command.publicId}' not found.`);

    if (!command.isActive && plan.platformPlanId) {
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

    const updated = await this.planRepository.update(plan.id, {
      isActive: command.isActive,
    });
    await this.entitlementService.invalidateAll();
    return updated;
  }
}
