import {
  BadGatewayException,
  ConflictException,
  Inject,
  Logger,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreatePlanCommand } from '../create-plan.command';
import { PLAN_REPOSITORY } from '../../../domain/plan.repository.interface';
import type { IPlanRepository } from '../../../domain/plan.repository.interface';
import { PlanOrmEntity } from '../../../infrastructure/persistence/plan.orm-entity';
import { PAYMENT_GATEWAY_PORT } from '../../ports/payment-gateway.port';
import type { PaymentGatewayPort } from '../../ports/payment-gateway.port';

@CommandHandler(CreatePlanCommand)
export class CreatePlanHandler implements ICommandHandler<
  CreatePlanCommand,
  PlanOrmEntity
> {
  private readonly logger = new Logger(CreatePlanHandler.name);

  constructor(
    @Inject(PLAN_REPOSITORY)
    private readonly planRepository: IPlanRepository,
    @Inject(PAYMENT_GATEWAY_PORT)
    private readonly paymentGateway: PaymentGatewayPort,
  ) {}

  async execute(command: CreatePlanCommand): Promise<PlanOrmEntity> {
    const existing = await this.planRepository.findByName(command.name);
    if (existing) {
      throw new ConflictException(
        `A plan with the name "${command.name}" already exists.`,
      );
    }

    const shouldCreatePlatformPlan =
      command.billingCycle !== 'free' && command.price > 0;

    let platformPlanId: string | null = null;
    if (shouldCreatePlatformPlan) {
      try {
        const result = await this.paymentGateway.createSubscriptionPlan({
          amountCents: Math.round(command.price * 100),
          billingCycle: command.billingCycle,
          currency: command.currency,
          fee: '',
          isActive: command.isActive,
          name: command.name,
        });
        platformPlanId = result.planId;
      } catch (error) {
        this.logger.error(
          `Paymob subscription plan creation failed for plan "${command.name}": ${(error as Error).message}`,
        );
        throw new BadGatewayException(
          'Failed to create the payment provider plan.',
        );
      }
    }

    if (command.isDefault) {
      const existingDefault = await this.planRepository.findDefault();
      if (existingDefault) {
        await this.planRepository.save({
          ...existingDefault,
          isDefault: false,
        });
      }
    }

    return this.planRepository.save({
      name: command.name,
      displayNameAr: command.displayNameAr,
      displayNameEn: command.displayNameEn,
      price: String(command.price),
      currency: command.currency,
      billingCycle: command.billingCycle,
      platformPlanId,
      commissionRate: String(command.commissionRate),
      features: command.features,
      isActive: command.isActive,
      isDefault: command.isDefault ?? false,
    });
  }
}
