import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CancelOrderCommand } from './cancel-order.command';
import type { ITradeOrderRepository } from '../../domain/order.repository.interface';
import { TRADE_ORDER_REPOSITORY } from '../../domain/order.repository.interface';
import {
  OrderNotFoundException,
  OrderAccessDeniedException,
} from '../../domain/order.exceptions';
import { OrderCancelledEvent } from '../../domain/events/order-cancelled.event';

@CommandHandler(CancelOrderCommand)
export class CancelOrderHandler implements ICommandHandler<CancelOrderCommand> {
  constructor(
    @Inject(TRADE_ORDER_REPOSITORY)
    private readonly tradeOrderRepo: ITradeOrderRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CancelOrderCommand): Promise<void> {
    const order = await this.tradeOrderRepo.findByPublicId(command.orderId);
    if (!order || !order.internalId) {
      throw new OrderNotFoundException(command.orderId);
    }
    if (order.buyerId !== command.actorId) {
      throw new OrderAccessDeniedException(command.orderId);
    }

    order.cancel();
    await this.tradeOrderRepo.update(order);

    this.eventBus.publish(
      new OrderCancelledEvent(order.id, order.shippingMethod),
    );
  }
}
