import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { HandleSubscriptionWebhookCommand } from '../handle-subscription-webhook.command';
import { PAYMENT_RECORD_REPOSITORY } from '../../../../../payment/domain/payment-intent.repository.interface';
import type { IPaymentRecordRepository } from '../../../../../payment/domain/payment-intent.repository.interface';
import { SUBSCRIPTION_REPOSITORY } from '../../../domain/subscription.repository.interface';
import type { ISubscriptionRepository } from '../../../domain/subscription.repository.interface';
import { PAYMENT_GATEWAY_PORT } from '../../ports/payment-gateway.port';
import type { PaymentGatewayPort } from '../../ports/payment-gateway.port';

@CommandHandler(HandleSubscriptionWebhookCommand)
export class HandleSubscriptionWebhookHandler implements ICommandHandler<
  HandleSubscriptionWebhookCommand,
  { received: boolean }
> {
  private readonly logger = new Logger(HandleSubscriptionWebhookHandler.name);

  constructor(
    @Inject(PAYMENT_RECORD_REPOSITORY)
    private readonly paymentRecordRepository: IPaymentRecordRepository,
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepository: ISubscriptionRepository,
    @Inject(PAYMENT_GATEWAY_PORT)
    private readonly paymentGateway: PaymentGatewayPort,
  ) {}

  async execute(
    command: HandleSubscriptionWebhookCommand,
  ): Promise<{ received: boolean }> {
    let event;
    try {
      event = this.paymentGateway.verifyAndParseWebhook(
        command.body,
        command.hmac,
      );
    } catch (error) {
      this.logger.warn(
        `Subscription webhook verification failed: ${(error as Error).message}`,
      );
      return { received: false };
    }

    this.logger.log(
      `Paymob subscription webhook: txn=${event.transactionId} merchantRef=${event.merchantOrderId} type=${event.type}`,
    );

    const merchantRef = event.merchantOrderId ?? event.orderId;
    const originalRecord =
      await this.paymentRecordRepository.findByPaymobOrderId(merchantRef);

    if (!originalRecord?.subscriptionId) {
      this.logger.warn(
        `No subscription-linked payment record found for merchant ref ${merchantRef}`,
      );
      return { received: true };
    }

    const subscription = await this.subscriptionRepository.findById(
      originalRecord.subscriptionId,
    );
    if (!subscription) {
      this.logger.warn(
        `Subscription ${originalRecord.subscriptionId} not found`,
      );
      return { received: true };
    }

    if (event.success) {
      const periodDuration =
        subscription.currentPeriodEnd.getTime() -
        subscription.currentPeriodStart.getTime();
      const newPeriodStart = new Date(subscription.currentPeriodEnd);
      const newPeriodEnd = new Date(newPeriodStart.getTime() + periodDuration);

      await this.subscriptionRepository.save({
        ...subscription,
        status: 'active',
        currentPeriodStart: newPeriodStart,
        currentPeriodEnd: newPeriodEnd,
      });

      await this.paymentRecordRepository.save({
        supplierId: originalRecord.supplierId,
        subscriptionId: originalRecord.subscriptionId,
        paymentIntentId: event.transactionId,
        paymobOrderId: event.transactionId,
        amount: event.amountCents / 100,
        currency: originalRecord.currency,
        status: 'succeeded',
      });
    } else if (event.type === 'failed') {
      await this.subscriptionRepository.save({
        ...subscription,
        status: 'past_due',
      });

      await this.paymentRecordRepository.save({
        supplierId: originalRecord.supplierId,
        subscriptionId: originalRecord.subscriptionId,
        paymentIntentId: event.transactionId,
        paymobOrderId: event.transactionId,
        amount: event.amountCents / 100,
        currency: originalRecord.currency,
        status: 'failed',
      });
    }

    return { received: true };
  }
}
