import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { CreatePaymentIntentCommand } from './create-payment-intent.command';
import { PAYMENT_RECORD_REPOSITORY } from '../../domain/payment-intent.repository.interface';
import type { IPaymentRecordRepository } from '../../domain/payment-intent.repository.interface';
import { SUBSCRIPTION_REPOSITORY } from '../../../supplier/subscription/domain/subscription.repository.interface';
import type { ISubscriptionRepository } from '../../../supplier/subscription/domain/subscription.repository.interface';
import { PLAN_REPOSITORY } from '../../../supplier/subscription/domain/plan.repository.interface';
import type { IPlanRepository } from '../../../supplier/subscription/domain/plan.repository.interface';
import { PAYMENT_GATEWAY_PORT } from '../ports/payment-gateway.port';
import type { PaymentGatewayPort } from '../ports/payment-gateway.port';

@CommandHandler(CreatePaymentIntentCommand)
export class CreatePaymentIntentHandler implements ICommandHandler<
  CreatePaymentIntentCommand,
  { clientSecret: string }
> {
  constructor(
    @Inject(PAYMENT_RECORD_REPOSITORY)
    private readonly paymentRecordRepository: IPaymentRecordRepository,
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepository: ISubscriptionRepository,
    @Inject(PLAN_REPOSITORY)
    private readonly planRepository: IPlanRepository,
    @Inject(PAYMENT_GATEWAY_PORT)
    private readonly paymentGateway: PaymentGatewayPort,
  ) {}

  async execute(
    command: CreatePaymentIntentCommand,
  ): Promise<{ clientSecret: string }> {
    const subscription = await this.subscriptionRepository.findBySupplierId(
      command.userId,
    );
    if (!subscription) throw new NotFoundException('Subscription not found.');
    if (subscription.status !== 'pending_payment') {
      throw new BadRequestException('Subscription does not require payment.');
    }
    if (String(subscription.id) !== String(command.subscriptionId)) {
      throw new BadRequestException(
        'Subscription does not match the requested subscription.',
      );
    }

    const plan = await this.planRepository.findById(subscription.planId);
    if (!plan) throw new NotFoundException('Plan not found.');

    const amountInCents = Math.round(Number(plan.price) * 100);
    const merchantOrderId = randomUUID();

    const result = await this.paymentGateway.createPayment({
      amountCents: amountInCents,
      currency: plan.currency.toLowerCase(),
      merchantOrderId,
    });

    await this.paymentRecordRepository.save({
      supplierId: command.userId,
      subscriptionId: subscription.id,
      paymentIntentId: result.paymentIntentId,
      paymobOrderId: result.paymentIntentId,
      amount: Number(plan.price),
      currency: plan.currency,
      status: 'pending',
    });

    return { clientSecret: result.clientSecret };
  }
}
