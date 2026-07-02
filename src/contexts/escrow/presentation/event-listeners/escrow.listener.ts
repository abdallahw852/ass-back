import { CommandBus, EventsHandler, type IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { OrderPaidEvent } from '../../../order/domain/events/order-paid.event';
import { OrderReleasedEvent } from '../../../order/domain/events/order-released.event';
import { OrderDisputedEvent } from '../../../order/domain/events/order-disputed.event';
import { OrderRefundedEvent } from '../../../order/domain/events/order-refunded.event';
import { FundEscrowCommand } from '../../application/commands/fund-escrow.command';
import { ReleaseMilestoneCommand } from '../../application/commands/release-milestone.command';
import { FreezeEscrowCommand } from '../../application/commands/freeze-escrow.command';
import { RefundEscrowCommand } from '../../application/commands/refund-escrow.command';

type EscrowTriggerEvent =
  | OrderPaidEvent
  | OrderReleasedEvent
  | OrderDisputedEvent
  | OrderRefundedEvent;

@EventsHandler(
  OrderPaidEvent,
  OrderReleasedEvent,
  OrderDisputedEvent,
  OrderRefundedEvent,
)
export class EscrowListener implements IEventHandler<EscrowTriggerEvent> {
  private readonly logger = new Logger(EscrowListener.name);

  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: EscrowTriggerEvent): Promise<void> {
    try {
      if (event instanceof OrderPaidEvent) {
        await this.commandBus.execute(
          new FundEscrowCommand(
            event.orderId,
            event.orderInternalId,
            event.buyerId,
            event.supplierId,
            event.amount,
            event.currency,
            event.providerRef,
          ),
        );
      } else if (event instanceof OrderReleasedEvent) {
        await this.commandBus.execute(
          new ReleaseMilestoneCommand(
            event.orderId,
            event.orderInternalId,
            event.supplierId,
            event.amount,
            event.currency,
          ),
        );
      } else if (event instanceof OrderDisputedEvent) {
        await this.commandBus.execute(
          new FreezeEscrowCommand(event.orderInternalId),
        );
      } else if (event instanceof OrderRefundedEvent) {
        await this.commandBus.execute(
          new RefundEscrowCommand(
            event.orderId,
            event.orderInternalId,
            event.buyerId,
            event.supplierId,
            event.amount,
            event.currency,
            event.reason,
          ),
        );
      }
    } catch (err) {
      this.logger.error('EscrowListener failed', err);
    }
  }
}
