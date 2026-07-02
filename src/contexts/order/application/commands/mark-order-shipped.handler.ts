import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { MarkOrderShippedCommand } from './mark-order-shipped.command';
import type { ITradeOrderRepository } from '../../domain/order.repository.interface';
import { TRADE_ORDER_REPOSITORY } from '../../domain/order.repository.interface';
import {
  OrderAccessDeniedException,
  OrderNotFoundException,
} from '../../domain/order.exceptions';
import { OrderShippedEvent } from '../../domain/events/order-shipped.event';

@CommandHandler(MarkOrderShippedCommand)
export class MarkOrderShippedHandler implements ICommandHandler<MarkOrderShippedCommand> {
  constructor(
    @Inject(TRADE_ORDER_REPOSITORY)
    private readonly tradeOrderRepo: ITradeOrderRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: MarkOrderShippedCommand): Promise<void> {
    const order = await this.tradeOrderRepo.findByPublicId(command.orderId);
    if (!order) throw new OrderNotFoundException(command.orderId);
    if (order.supplierId !== command.supplierId)
      throw new OrderAccessDeniedException(command.orderId);

    order.markAsShippedBySupplier(
      command.carrier,
      command.trackingNumber,
      command.trackingUrl ?? null,
    );
    await this.tradeOrderRepo.update(order);

    this.eventBus.publish(
      new OrderShippedEvent(order.id, order.buyerId, order.supplierId),
    );
  }
}
