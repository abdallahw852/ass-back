import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { MarkOrderDeliveredCommand } from './mark-order-delivered.command';
import type { ITradeOrderRepository } from '../../domain/order.repository.interface';
import { TRADE_ORDER_REPOSITORY } from '../../domain/order.repository.interface';
import {
  OrderNotFoundException,
  OrderAccessDeniedException,
} from '../../domain/order.exceptions';
import { OrderDeliveredEvent } from '../../domain/events/order-delivered.event';

@CommandHandler(MarkOrderDeliveredCommand)
export class MarkOrderDeliveredHandler implements ICommandHandler<MarkOrderDeliveredCommand> {
  constructor(
    @Inject(TRADE_ORDER_REPOSITORY)
    private readonly tradeOrderRepo: ITradeOrderRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: MarkOrderDeliveredCommand): Promise<void> {
    const order = await this.tradeOrderRepo.findByPublicId(command.orderId);
    if (!order) throw new OrderNotFoundException(command.orderId);
    if (order.supplierId !== command.actorId)
      throw new OrderAccessDeniedException(command.orderId);

    order.markAsDelivered();
    await this.tradeOrderRepo.update(order);

    this.eventBus.publish(
      new OrderDeliveredEvent(
        order.id,
        order.buyerId,
        order.supplierId,
        order.autoReleaseAt!,
      ),
    );
  }
}
