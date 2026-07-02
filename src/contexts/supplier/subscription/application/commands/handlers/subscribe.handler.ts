import {
  BadRequestException,
  ConflictException,
  Inject,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { SubscribeCommand } from '../subscribe.command';
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

@CommandHandler(SubscribeCommand)
export class SubscribeHandler implements ICommandHandler<
  SubscribeCommand,
  {
    subscription: Record<string, unknown> | null;
    requiresPayment: boolean;
    clientSecret?: string;
  }
> {
  private readonly logger = new Logger(SubscribeHandler.name);

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

  async execute(command: SubscribeCommand) {
    const supplier = await this.supplierRepository.findByUserId(command.userId);
    if (!supplier) throw new NotFoundException('Supplier profile not found.');

    const plan = await this.planRepository.findByPublicId(command.planId);
    if (!plan) throw new NotFoundException('Plan not found.');
    if (!plan.isActive)
      throw new BadRequestException('Plan is no longer available.');

    const existing = await this.subscriptionRepository.findBySupplierId(
      supplier.id,
    );
    if (existing && existing.status === 'active') {
      throw new ConflictException(
        'Supplier already has an active subscription.',
      );
    }

    const isFree = Number(plan.price) === 0;

    if (isFree) {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setFullYear(periodEnd.getFullYear() + 100);

      const subscription = await this.subscriptionRepository.save({
        supplierId: supplier.id,
        planId: plan.id,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });

      return {
        subscription: subscription as unknown as Record<string, unknown>,
        requiresPayment: false,
      };
    }

    const amountInCents = Math.round(Number(plan.price) * 100);
    const merchantOrderId = randomUUID();

    let result;
    try {
      result = await this.paymentGateway.createPaymentIntention({
        amountCents: amountInCents,
        currency: plan.currency.toLowerCase(),
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
      planId: plan.id,
      paymentIntentId: result.paymentIntentId,
      paymobOrderId: merchantOrderId,
      amount: Number(plan.price),
      currency: plan.currency,
      status: 'pending',
    });

    return {
      subscription: null,
      requiresPayment: true,
      clientSecret: result.clientSecret,
    };
  }
}
