import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs';
import { MarkOrderShippedByPlatformCommand } from './mark-order-shipped-by-platform.command';
import type { ITradeOrderRepository } from '../../domain/order.repository.interface';
import { TRADE_ORDER_REPOSITORY } from '../../domain/order.repository.interface';
import { OrderNotFoundException } from '../../domain/order.exceptions';
import { OrderShippedEvent } from '../../domain/events/order-shipped.event';

@CommandHandler(MarkOrderShippedByPlatformCommand)
export class MarkOrderShippedByPlatformHandler implements ICommandHandler<MarkOrderShippedByPlatformCommand> {
  constructor(
    @Inject(TRADE_ORDER_REPOSITORY)
    private readonly tradeOrderRepo: ITradeOrderRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: MarkOrderShippedByPlatformCommand): Promise<void> {
    const order = await this.tradeOrderRepo.findByPublicId(command.orderId);
    if (!order) throw new OrderNotFoundException(command.orderId);

    order.markAsShippedByPlatform(
      command.carrier,
      command.trackingNumber,
      command.trackingUrl,
    );
    await this.tradeOrderRepo.update(order);

    this.eventBus.publish(
      new OrderShippedEvent(order.id, order.buyerId, order.supplierId),
    );
  }
}
