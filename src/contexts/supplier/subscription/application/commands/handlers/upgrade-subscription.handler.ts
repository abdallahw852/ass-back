import { BadRequestException, Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { UpgradeSubscriptionCommand } from '../upgrade-subscription.command';
import { PLAN_REPOSITORY } from '../../../domain/plan.repository.interface';
import type { IPlanRepository } from '../../../domain/plan.repository.interface';
import { SUBSCRIPTION_REPOSITORY } from '../../../domain/subscription.repository.interface';
import type { ISubscriptionRepository } from '../../../domain/subscription.repository.interface';
import { PAYMENT_GATEWAY_PORT } from '../../ports/payment-gateway.port';
import type { PaymentGatewayPort } from '../../ports/payment-gateway.port';
import { PAYMENT_RECORD_REPOSITORY } from '../../../../../payment/domain/payment-intent.repository.interface';
import type { IPaymentRecordRepository } from '../../../../../payment/domain/payment-intent.repository.interface';
import { SUPPLIER_REPOSITORY } from '../../../../identity/domain/repositories/supplier.repository.interface';
import type { ISupplierRepository } from '../../../../identity/domain/repositories/supplier.repository.interface';
import {
  AlreadyOnRequestedPlanException,
  CannotUpgradeToFreePlanException,
  NoActiveSubscriptionException,
  PlanInactiveException,
  PlanNotFoundException,
  SupplierProfileNotFoundException,
} from '../../../domain/subscription.exceptions';

@CommandHandler(UpgradeSubscriptionCommand)
export class UpgradeSubscriptionHandler implements ICommandHandler<
  UpgradeSubscriptionCommand,
  {
    subscription: null;
    requiresPayment: boolean;
    clientSecret?: string;
  }
> {
  private readonly logger = new Logger(UpgradeSubscriptionHandler.name);

  constructor(
    @Inject(PLAN_REPOSITORY)
    private readonly planRepository: IPlanRepository,
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepository: ISubscriptionRepository,
    @Inject(PAYMENT_GATEWAY_PORT)
    private readonly paymentGateway: PaymentGatewayPort,
    @Inject(PAYMENT_RECORD_REPOSITORY)
    private readonly paymentRecordRepository: IPaymentRecordRepository,
    @Inject(SUPPLIER_REPOSITORY)
    private readonly supplierRepository: ISupplierRepository,
  ) {}

  async execute(command: UpgradeSubscriptionCommand) {
    const supplier = await this.supplierRepository.findByUserId(command.userId);
    if (!supplier) throw new SupplierProfileNotFoundException();

    const existing = await this.subscriptionRepository.findBySupplierId(
      supplier.id,
    );
    if (!existing || existing.status !== 'active')
      throw new NoActiveSubscriptionException();

    const targetPlan = await this.planRepository.findByPublicId(command.planId);
    if (!targetPlan) throw new PlanNotFoundException();
    if (!targetPlan.isActive) throw new PlanInactiveException();
    if (targetPlan.isDefault) throw new CannotUpgradeToFreePlanException();
    if (targetPlan.id === existing.planId)
      throw new AlreadyOnRequestedPlanException();

    const amountInCents = Math.round(Number(targetPlan.price) * 100);
    const merchantOrderId = randomUUID();

    let result;
    try {
      result = await this.paymentGateway.createPaymentIntention({
        amountCents: amountInCents,
        currency: targetPlan.currency.toLowerCase(),
        merchantOrderId,
      });
    } catch (error) {
      this.logger.error(
        `Paymob payment creation failed for supplier ${supplier.id}: ${(error as Error).message}`,
      );
      throw new BadRequestException(
        'Failed to initiate payment. Please try again later.',
      );
    }

    await this.paymentRecordRepository.save({
      supplierId: supplier.id,
      planId: targetPlan.id,
      subscriptionId: existing.id,
      paymentIntentId: result.paymentIntentId,
      paymobOrderId: merchantOrderId,
      amount: Number(targetPlan.price),
      currency: targetPlan.currency,
      status: 'pending',
    });

    return {
      subscription: null,
      requiresPayment: true,
      clientSecret: result.clientSecret,
    };
  }
}
