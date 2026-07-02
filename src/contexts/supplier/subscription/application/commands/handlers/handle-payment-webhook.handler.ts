import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler, CommandBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HandlePaymentWebhookCommand } from '../handle-payment-webhook.command';
import { PAYMENT_RECORD_REPOSITORY } from '../../../../../payment/domain/payment-intent.repository.interface';
import type { IPaymentRecordRepository } from '../../../../../payment/domain/payment-intent.repository.interface';
import { SUBSCRIPTION_REPOSITORY } from '../../../domain/subscription.repository.interface';
import type { ISubscriptionRepository } from '../../../domain/subscription.repository.interface';
import { PLAN_REPOSITORY } from '../../../domain/plan.repository.interface';
import type { IPlanRepository } from '../../../domain/plan.repository.interface';
import { PAYMENT_GATEWAY_PORT } from '../../ports/payment-gateway.port';
import type { PaymentGatewayPort } from '../../ports/payment-gateway.port';
import { MarkOrderPaidCommand } from '../../../../../order/application/commands/mark-order-paid.command';
import { WebhookEventOrmEntity } from '../../../../../payment/infrastructure/persistence/webhook-event.orm-entity';

@CommandHandler(HandlePaymentWebhookCommand)
export class HandlePaymentWebhookHandler implements ICommandHandler<
  HandlePaymentWebhookCommand,
  { received: boolean }
> {
  private readonly logger = new Logger(HandlePaymentWebhookHandler.name);

  constructor(
    @Inject(PAYMENT_RECORD_REPOSITORY)
    private readonly paymentRecordRepository: IPaymentRecordRepository,
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepository: ISubscriptionRepository,
    @Inject(PLAN_REPOSITORY)
    private readonly planRepository: IPlanRepository,
    @Inject(PAYMENT_GATEWAY_PORT)
    private readonly paymentGateway: PaymentGatewayPort,
    @InjectRepository(WebhookEventOrmEntity, 'write')
    private readonly webhookEventRepo: Repository<WebhookEventOrmEntity>,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(
    command: HandlePaymentWebhookCommand,
  ): Promise<{ received: boolean }> {
    let event;
    try {
      event = this.paymentGateway.verifyAndParseWebhook(
        command.body,
        command.hmac,
      );
    } catch (error) {
      this.logger.warn(
        `Webhook verification failed: ${(error as Error).message}`,
      );
      return { received: false };
    }

    // Dedup: skip if this transaction was already processed
    const insertResult = await this.webhookEventRepo
      .createQueryBuilder()
      .insert()
      .into(WebhookEventOrmEntity)
      .values({
        provider: 'paymob',
        event_id: event.transactionId,
        signature_verified: true,
        payload: command.body as any,
      })
      .orIgnore()
      .execute();

    if (!insertResult.identifiers.length) {
      this.logger.warn(
        `Duplicate Paymob webhook: txn=${event.transactionId} — skipping`,
      );
      return { received: true };
    }

    this.logger.log(
      `Paymob webhook: txn=${event.transactionId} merchantRef=${event.merchantOrderId} type=${event.type}`,
    );

    const lookupRef = event.merchantOrderId ?? event.orderId;
    const record =
      await this.paymentRecordRepository.findByPaymobOrderId(lookupRef);

    if (record) {
      if (event.success) {
        await this.paymentRecordRepository.save({
          ...record,
          status: 'succeeded',
        });

        if (!record.planId) {
          this.logger.warn(
            `Payment record ${record.id} has no planId — cannot create subscription`,
          );
        } else {
          const existingSubscription =
            await this.subscriptionRepository.findBySupplierId(
              record.supplierId,
            );

          if (
            record.subscriptionId &&
            record.planId &&
            existingSubscription &&
            existingSubscription.status === 'active' &&
            existingSubscription.planId !== record.planId
          ) {
            const newPlan = await this.planRepository.findById(record.planId);
            if (newPlan) {
              const now = new Date();
              const periodEnd = new Date(now);
              if (newPlan.billingCycle === 'monthly') {
                periodEnd.setMonth(periodEnd.getMonth() + 1);
              } else if (newPlan.billingCycle === 'yearly') {
                periodEnd.setFullYear(periodEnd.getFullYear() + 1);
              } else {
                periodEnd.setFullYear(periodEnd.getFullYear() + 100);
              }

              await this.subscriptionRepository.save({
                ...existingSubscription,
                planId: newPlan.id,
                status: 'active',
                cancelAtPeriodEnd: false,
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
              });
              await this.paymentRecordRepository.save({
                ...record,
                status: 'succeeded',
              });
              return { received: true };
            }
          }

          if (existingSubscription?.status !== 'active') {
            const plan = await this.planRepository.findById(record.planId);
            if (!plan) {
              this.logger.warn(`Plan ${record.planId} not found`);
            } else {
              const now = new Date();
              const periodEnd = new Date(now);
              if (plan.billingCycle === 'monthly') {
                periodEnd.setMonth(periodEnd.getMonth() + 1);
              } else if (plan.billingCycle === 'yearly') {
                periodEnd.setFullYear(periodEnd.getFullYear() + 1);
              } else {
                periodEnd.setFullYear(periodEnd.getFullYear() + 100);
              }

              const subscription = await this.subscriptionRepository.save({
                supplierId: record.supplierId,
                planId: plan.id,
                status: 'active',
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
              });

              await this.paymentRecordRepository.save({
                ...record,
                subscriptionId: subscription.id,
              });
            }
          }
        }
      } else if (event.type === 'failed') {
        await this.paymentRecordRepository.save({
          ...record,
          status: 'failed',
        });
      }
    } else {
      this.logger.log(
        `No payment record found for merchant ref ${lookupRef}, assuming trade order.`,
      );
    }

    if (event.success) {
      await this.commandBus.execute(new MarkOrderPaidCommand(lookupRef));
    }

    return { received: true };
  }
}
