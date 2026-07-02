import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ConfirmOrderReceiptCommand } from './confirm-order-receipt.command';
import type { ITradeOrderRepository } from '../../domain/order.repository.interface';
import { TRADE_ORDER_REPOSITORY } from '../../domain/order.repository.interface';
import {
  OrderAccessDeniedException,
  OrderNotFoundException,
} from '../../domain/order.exceptions';
import { OrderReleasedEvent } from '../../domain/events/order-released.event';

@CommandHandler(ConfirmOrderReceiptCommand)
export class ConfirmOrderReceiptHandler implements ICommandHandler<ConfirmOrderReceiptCommand> {
  constructor(
    @Inject(TRADE_ORDER_REPOSITORY)
    private readonly tradeOrderRepo: ITradeOrderRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: ConfirmOrderReceiptCommand): Promise<void> {
    const order = await this.tradeOrderRepo.findByPublicId(command.orderId);
    if (!order) throw new OrderNotFoundException(command.orderId);
    if (order.buyerId !== command.buyerId)
      throw new OrderAccessDeniedException(command.orderId);

    order.confirmReceipt();
    await this.tradeOrderRepo.update(order);

    this.eventBus.publish(
      new OrderReleasedEvent(
        order.id,
        order.internalId!,
        order.buyerId,
        order.supplierId,
        order.subtotal,
        order.currency,
        'buyer_confirm',
      ),
    );
  }
}
