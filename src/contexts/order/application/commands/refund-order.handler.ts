import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { RefundOrderCommand } from './refund-order.command';
import type { ITradeOrderRepository } from '../../domain/order.repository.interface';
import { TRADE_ORDER_REPOSITORY } from '../../domain/order.repository.interface';
import {
  OrderNotFoundException,
  RefundAmountExceededException,
} from '../../domain/order.exceptions';
import { OrderRefundedEvent } from '../../domain/events/order-refunded.event';

@CommandHandler(RefundOrderCommand)
export class RefundOrderHandler implements ICommandHandler<RefundOrderCommand> {
  constructor(
    @Inject(TRADE_ORDER_REPOSITORY)
    private readonly tradeOrderRepo: ITradeOrderRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RefundOrderCommand): Promise<void> {
    const order = await this.tradeOrderRepo.findByPublicId(command.orderId);
    if (!order) throw new OrderNotFoundException(command.orderId);
    if (command.amount > order.subtotal)
      throw new RefundAmountExceededException(command.amount, order.subtotal);

    order.refund();
    await this.tradeOrderRepo.update(order);

    this.eventBus.publish(
      new OrderRefundedEvent(
        order.id,
        order.internalId!,
        order.buyerId,
        order.supplierId,
        command.amount,
        order.currency,
        command.reason,
      ),
    );
  }
}
