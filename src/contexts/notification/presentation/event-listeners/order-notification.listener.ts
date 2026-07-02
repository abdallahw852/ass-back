import { CommandBus, EventsHandler, type IEventHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { OrderPaidEvent } from '../../../order/domain/events/order-paid.event';
import { OrderShippedEvent } from '../../../order/domain/events/order-shipped.event';
import { OrderDeliveredEvent } from '../../../order/domain/events/order-delivered.event';
import { OrderReleasedEvent } from '../../../order/domain/events/order-released.event';
import { OrderDisputedEvent } from '../../../order/domain/events/order-disputed.event';
import { OrderRefundedEvent } from '../../../order/domain/events/order-refunded.event';
import { CreateNotificationCommand } from '../../application/commands/create-notification.command';
import { NotificationType } from '../../domain/notification.types';
import { EmailService } from '../../../../shared/infrastructure/services/email.service';
import { UserOrmEntity } from '../../../auth/infrastructure/persistence/user.orm-entity';
import { TradeOrderOrmEntity } from '../../../order/infrastructure/persistence/trade-order.orm-entity';

type OrderEvent =
  | OrderPaidEvent
  | OrderShippedEvent
  | OrderDeliveredEvent
  | OrderReleasedEvent
  | OrderDisputedEvent
  | OrderRefundedEvent;

const HIGH_IMPACT_EVENTS = [
  OrderPaidEvent,
  OrderShippedEvent,
  OrderDisputedEvent,
  OrderRefundedEvent,
];

@EventsHandler(
  OrderPaidEvent,
  OrderShippedEvent,
  OrderDeliveredEvent,
  OrderReleasedEvent,
  OrderDisputedEvent,
  OrderRefundedEvent,
)
export class OrderNotificationsListener implements IEventHandler<OrderEvent> {
  private readonly logger = new Logger(OrderNotificationsListener.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    @InjectRepository(UserOrmEntity, 'write')
    private readonly userRepo: Repository<UserOrmEntity>,
    @InjectRepository(TradeOrderOrmEntity, 'write')
    private readonly orderRepo: Repository<TradeOrderOrmEntity>,
  ) {}

  async handle(event: OrderEvent): Promise<void> {
    try {
      await this.dispatch(event);
    } catch (err) {
      this.logger.error(
        `OrderNotificationsListener failed for ${event.constructor.name}`,
        err,
      );
    }
  }

  private async dispatch(event: OrderEvent): Promise<void> {
    const appUrl =
      this.configService.get<string>('APP_URL') ?? 'https://app.asasgate.net';

    if (event instanceof OrderPaidEvent) {
      const order = await this.orderRepo.findOne({
        where: { _id: event.orderId },
      });
      const [buyer, supplier] = await this.loadUsers(
        event.buyerId,
        event.supplierId,
      );
      const ref = order?.reference_number ?? event.orderId;

      await this.createInApp(event.buyerId, NotificationType.ORDER_PAID, {
        orderId: event.orderId,
        ref,
      });
      await this.createInApp(event.supplierId, NotificationType.ORDER_PAID, {
        orderId: event.orderId,
        ref,
      });

      await this.sendEmail(buyer?.email, {
        subject: `Order Paid: ${ref}`,
        recipientName: buyer?.name ?? 'Buyer',
        orderRef: ref,
        statusMessage: 'Your payment has been received and is held securely.',
        deepLink: `${appUrl}/orders/${event.orderId}`,
        ctaLabel: 'View Order',
      });
      await this.sendEmail(supplier?.email, {
        subject: `New Order Received: ${ref}`,
        recipientName: supplier?.name ?? 'Supplier',
        orderRef: ref,
        statusMessage:
          'A buyer has paid for an order. Please prepare and ship the goods.',
        deepLink: `${appUrl}/dashboard/orders/${event.orderId}`,
        ctaLabel: 'View Order',
      });
    } else if (event instanceof OrderShippedEvent) {
      const order = await this.orderRepo.findOne({
        where: { _id: event.orderId },
      });
      const [buyer, supplier] = await this.loadUsers(
        event.buyerId,
        event.supplierId,
      );
      const ref = order?.reference_number ?? event.orderId;

      await this.createInApp(event.buyerId, NotificationType.ORDER_SHIPPED, {
        orderId: event.orderId,
        ref,
      });
      await this.sendEmail(buyer?.email, {
        subject: `Your Order Has Been Shipped: ${ref}`,
        recipientName: buyer?.name ?? 'Buyer',
        orderRef: ref,
        statusMessage: 'Your order has been shipped and is on its way.',
        deepLink: `${appUrl}/orders/${event.orderId}`,
        ctaLabel: 'Track Order',
      });
    } else if (event instanceof OrderDeliveredEvent) {
      const order = await this.orderRepo.findOne({
        where: { _id: event.orderId },
      });
      const [buyer] = await this.loadUsers(event.buyerId, event.supplierId);
      const ref = order?.reference_number ?? event.orderId;

      await this.createInApp(event.buyerId, NotificationType.ORDER_DELIVERED, {
        orderId: event.orderId,
        ref,
        autoReleaseAt: event.autoReleaseAt,
      });
      await this.sendEmail(buyer?.email, {
        subject: `Order Delivered: ${ref}`,
        recipientName: buyer?.name ?? 'Buyer',
        orderRef: ref,
        statusMessage:
          'Your order has been marked as delivered. Please confirm receipt or open a dispute within 14 days.',
        deepLink: `${appUrl}/orders/${event.orderId}`,
        ctaLabel: 'Confirm Receipt',
      });
    } else if (event instanceof OrderReleasedEvent) {
      const [, supplier] = await this.loadUsers(
        event.buyerId,
        event.supplierId,
      );
      const ref = event.orderId;

      await this.createInApp(
        event.supplierId,
        NotificationType.ORDER_RELEASED,
        { orderId: event.orderId, ref, amount: event.amount },
      );
      await this.sendEmail(supplier?.email, {
        subject: `Payment Released: ${ref}`,
        recipientName: supplier?.name ?? 'Supplier',
        orderRef: ref,
        statusMessage: `${event.amount} ${event.currency} has been credited to your wallet.`,
        deepLink: `${appUrl}/dashboard/wallet`,
        ctaLabel: 'View Wallet',
      });
    } else if (event instanceof OrderDisputedEvent) {
      const order = await this.orderRepo.findOne({
        where: { _id: event.orderId },
      });
      const [buyer, supplier] = await this.loadUsers(
        event.buyerId,
        event.supplierId,
      );
      const ref = order?.reference_number ?? event.orderId;

      await this.createInApp(event.buyerId, NotificationType.ORDER_DISPUTED, {
        orderId: event.orderId,
        ref,
      });
      await this.createInApp(
        event.supplierId,
        NotificationType.ORDER_DISPUTED,
        { orderId: event.orderId, ref },
      );
      await this.sendEmail(buyer?.email, {
        subject: `Dispute Opened: ${ref}`,
        recipientName: buyer?.name ?? 'Buyer',
        orderRef: ref,
        statusMessage:
          'Your dispute has been opened. Our team will review and resolve it.',
        deepLink: `${appUrl}/orders/${event.orderId}`,
        ctaLabel: 'View Dispute',
      });
      await this.sendEmail(supplier?.email, {
        subject: `Dispute Opened on Your Order: ${ref}`,
        recipientName: supplier?.name ?? 'Supplier',
        orderRef: ref,
        statusMessage:
          'A buyer has opened a dispute on this order. Our team will review it.',
        deepLink: `${appUrl}/dashboard/orders/${event.orderId}`,
        ctaLabel: 'View Order',
      });
    } else if (event instanceof OrderRefundedEvent) {
      const [buyer] = await this.loadUsers(event.buyerId, event.supplierId);

      await this.createInApp(event.buyerId, NotificationType.ORDER_REFUNDED, {
        orderId: event.orderId,
        amount: event.amount,
        currency: event.currency,
      });
      await this.sendEmail(buyer?.email, {
        subject: `Refund Processed: Order ${event.orderId}`,
        recipientName: buyer?.name ?? 'Buyer',
        orderRef: event.orderId,
        statusMessage: `A refund of ${event.amount} ${event.currency} has been processed.`,
        deepLink: `${appUrl}/orders/${event.orderId}`,
        ctaLabel: 'View Order',
      });
    }
  }

  private async createInApp(
    userId: number,
    type: NotificationType,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.commandBus.execute(
        new CreateNotificationCommand(userId, type, payload),
      );
    } catch (err) {
      this.logger.error(
        `Failed to create in-app notification for user ${userId}`,
        err,
      );
    }
  }

  private async sendEmail(
    email: string | undefined | null,
    data: Parameters<EmailService['sendOrderStatusEmail']>[1],
  ): Promise<void> {
    if (!email) return;
    try {
      await this.emailService.sendOrderStatusEmail(email, data);
    } catch (err) {
      this.logger.error(`Failed to send order email to ${email}`, err);
    }
  }

  private async loadUsers(
    buyerId: number,
    supplierId: number,
  ): Promise<[UserOrmEntity | null, UserOrmEntity | null]> {
    return Promise.all([
      this.userRepo.findOne({ where: { id: buyerId } }),
      this.userRepo.findOne({ where: { id: supplierId } }),
    ]);
  }
}
