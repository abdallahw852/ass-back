import {
  BadGatewayException,
  Inject,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdatePlanCommand } from '../update-plan.command';
import { PLAN_REPOSITORY } from '../../../domain/plan.repository.interface';
import type { IPlanRepository } from '../../../domain/plan.repository.interface';
import { PlanOrmEntity } from '../../../infrastructure/persistence/plan.orm-entity';
import { PAYMENT_GATEWAY_PORT } from '../../ports/payment-gateway.port';
import type { PaymentGatewayPort } from '../../ports/payment-gateway.port';
import { ENTITLEMENT_SERVICE } from '../../../../../entitlement/domain/entitlement.service.interface';
import type { IEntitlementService } from '../../../../../entitlement/domain/entitlement.service.interface';

@CommandHandler(UpdatePlanCommand)
export class UpdatePlanHandler implements ICommandHandler<
  UpdatePlanCommand,
  PlanOrmEntity
> {
  private readonly logger = new Logger(UpdatePlanHandler.name);

  constructor(
    @Inject(PLAN_REPOSITORY)
    private readonly planRepository: IPlanRepository,
    @Inject(PAYMENT_GATEWAY_PORT)
    private readonly paymentGateway: PaymentGatewayPort,
    @Inject(ENTITLEMENT_SERVICE)
    private readonly entitlementService: IEntitlementService,
  ) {}

  async execute(command: UpdatePlanCommand): Promise<PlanOrmEntity> {
    const plan = await this.planRepository.findByPublicId(command.publicId);
    if (!plan)
      throw new NotFoundException(`Plan '${command.publicId}' not found.`);

    const patch: Partial<PlanOrmEntity> = {};
    if (command.name !== undefined) patch.name = command.name;
    if (command.displayNameAr !== undefined)
      patch.displayNameAr = command.displayNameAr;
    if (command.displayNameEn !== undefined)
      patch.displayNameEn = command.displayNameEn;
    if (command.currency !== undefined) patch.currency = command.currency;
    if (command.billingCycle !== undefined)
      patch.billingCycle = command.billingCycle;
    if (command.commissionRate !== undefined)
      patch.commissionRate = String(command.commissionRate);
    if (command.features !== undefined) patch.features = command.features;
    if (command.entitlements !== undefined)
      patch.entitlements = command.entitlements;
    if (command.isActive !== undefined) patch.isActive = command.isActive;

    const priceChanged =
      command.price !== undefined && Number(plan.price) !== command.price;

    if (priceChanged) {
      // Price is immutable on Paymob — deactivate old plan + create new one
      if (plan.platformPlanId && plan.billingCycle !== 'free') {
        try {
          await this.paymentGateway.deactivateSubscriptionPlan(
            plan.platformPlanId,
          );
        } catch (err) {
          this.logger.error(
            `Failed to deactivate old Paymob plan: ${(err as Error).message}`,
          );
          throw new BadGatewayException(
            'Failed to deactivate the existing payment provider plan.',
          );
        }
      }

      const newBillingCycle = command.billingCycle ?? plan.billingCycle;
      const newPrice = command.price;
      const newCurrency = command.currency ?? plan.currency;

      if (newBillingCycle !== 'free' && newPrice > 0) {
        try {
          const result = await this.paymentGateway.createSubscriptionPlan({
            amountCents: Math.round(newPrice * 100),
            billingCycle: newBillingCycle,
            currency: newCurrency,
            fee: '',
            isActive: command.isActive ?? plan.isActive,
            name: command.name ?? plan.name,
          });
          patch.platformPlanId = result.planId;
        } catch (err) {
          this.logger.error(
            `Failed to create new Paymob plan: ${(err as Error).message}`,
          );
          throw new BadGatewayException(
            'Failed to create the new payment provider plan.',
          );
        }
      } else {
        patch.platformPlanId = null;
      }

      patch.price = String(newPrice);
    } else if (
      plan.platformPlanId &&
      (command.name !== undefined || command.isActive !== undefined)
    ) {
      // Sync name/active change to Paymob
      try {
        await this.paymentGateway.updateSubscriptionPlan({
          platformPlanId: plan.platformPlanId,
          ...(command.name !== undefined ? { name: command.name } : {}),
          ...(command.isActive !== undefined
            ? { isActive: command.isActive }
            : {}),
        });
      } catch (err) {
        this.logger.warn(
          `Paymob sync failed (non-blocking): ${(err as Error).message}`,
        );
      }
    }

    if (command.isDefault === true) {
      const existingDefault = await this.planRepository.findDefault();
      if (existingDefault && existingDefault.id !== plan.id) {
        await this.planRepository.update(existingDefault.id, {
          isDefault: false,
        });
      }
      patch.isDefault = true;
    } else if (command.isDefault === false) {
      patch.isDefault = false;
    }

    const updated = await this.planRepository.update(plan.id, patch);
    await this.entitlementService.invalidateAll();
    return updated;
  }
}
