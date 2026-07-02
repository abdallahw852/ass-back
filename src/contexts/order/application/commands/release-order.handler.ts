import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ReleaseOrderCommand } from './release-order.command';
import type { ITradeOrderRepository } from '../../domain/order.repository.interface';
import { TRADE_ORDER_REPOSITORY } from '../../domain/order.repository.interface';
import { OrderNotFoundException } from '../../domain/order.exceptions';
import { OrderReleasedEvent } from '../../domain/events/order-released.event';

@CommandHandler(ReleaseOrderCommand)
export class ReleaseOrderHandler implements ICommandHandler<ReleaseOrderCommand> {
  constructor(
    @Inject(TRADE_ORDER_REPOSITORY)
    private readonly tradeOrderRepo: ITradeOrderRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: ReleaseOrderCommand): Promise<void> {
    const order = await this.tradeOrderRepo.findByPublicId(command.orderId);
    if (!order) throw new OrderNotFoundException(command.orderId);

    order.release();
    await this.tradeOrderRepo.update(order);

    this.eventBus.publish(
      new OrderReleasedEvent(
        order.id,
        order.internalId!,
        order.buyerId,
        order.supplierId,
        order.subtotal,
        order.currency,
        command.reason,
      ),
    );
  }
}
