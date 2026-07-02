import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { MarkOrderPaidCommand } from './mark-order-paid.command';
import type { ITradeOrderRepository } from '../../domain/order.repository.interface';
import { TRADE_ORDER_REPOSITORY } from '../../domain/order.repository.interface';
import { CartRepository } from '../../../cart/infrastructure/repositories/cart.repository';
import { OrderPaidEvent } from '../../domain/events/order-paid.event';

@CommandHandler(MarkOrderPaidCommand)
export class MarkOrderPaidHandler implements ICommandHandler<MarkOrderPaidCommand> {
  constructor(
    @Inject(TRADE_ORDER_REPOSITORY)
    private readonly tradeOrderRepo: ITradeOrderRepository,
    private readonly cartRepo: CartRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: MarkOrderPaidCommand): Promise<void> {
    const orders = await this.tradeOrderRepo.findByPaymobOrderId(
      command.paymobOrderId,
    );

    for (const order of orders) {
      if (order.status === 'pending_payment') {
        order.markAsPaid();
        await this.tradeOrderRepo.update(order);

        if (order.cartItemIds.length > 0) {
          await this.cartRepo.removeItemsByPublicIds(order.cartItemIds);
        }

        this.eventBus.publish(
          new OrderPaidEvent(
            order.id,
            order.internalId!,
            order.buyerId,
            order.supplierId,
            order.subtotal,
            order.currency,
            command.paymobOrderId,
            order.shippingMethod,
          ),
        );
      }
    }
  }
}
