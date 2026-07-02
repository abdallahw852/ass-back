import { CommandBus, EventsHandler, type IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { AppendAuditEventCommand } from '../../application/commands/append-audit-event.command';
import { OrderShippedEvent } from '../../../order/domain/events/order-shipped.event';
import { OrderDeliveredEvent } from '../../../order/domain/events/order-delivered.event';
import { OrderReleasedEvent } from '../../../order/domain/events/order-released.event';
import { OrderRefundedEvent } from '../../../order/domain/events/order-refunded.event';
import { OrderDisputedEvent } from '../../../order/domain/events/order-disputed.event';
import { EscrowFundedEvent } from '../../../escrow/domain/events/escrow-funded.event';
import { EscrowReleasedEvent } from '../../../escrow/domain/events/escrow-released.event';

type AuditableEvent =
  | OrderShippedEvent
  | OrderDeliveredEvent
  | OrderReleasedEvent
  | OrderRefundedEvent
  | OrderDisputedEvent
  | EscrowFundedEvent
  | EscrowReleasedEvent;

@EventsHandler(
  OrderShippedEvent,
  OrderDeliveredEvent,
  OrderReleasedEvent,
  OrderRefundedEvent,
  OrderDisputedEvent,
  EscrowFundedEvent,
  EscrowReleasedEvent,
)
export class AuditLogListener implements IEventHandler<AuditableEvent> {
  private readonly logger = new Logger(AuditLogListener.name);

  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: AuditableEvent): Promise<void> {
    try {
      if (event instanceof OrderShippedEvent) {
        await this.commandBus.execute(
          new AppendAuditEventCommand(
            'order',
            event.orderId,
            'order.shipped',
            event.supplierId,
            'supplier',
            { supplierId: event.supplierId },
          ),
        );
      } else if (event instanceof OrderDeliveredEvent) {
        await this.commandBus.execute(
          new AppendAuditEventCommand(
            'order',
            event.orderId,
            'order.delivered',
            null,
            'system',
            { autoReleaseAt: event.autoReleaseAt },
          ),
        );
      } else if (event instanceof OrderReleasedEvent) {
        await this.commandBus.execute(
          new AppendAuditEventCommand(
            'order',
            event.orderId,
            'order.released',
            null,
            event.reason,
            { amount: event.amount, currency: event.currency },
          ),
        );
      } else if (event instanceof OrderRefundedEvent) {
        await this.commandBus.execute(
          new AppendAuditEventCommand(
            'order',
            event.orderId,
            'order.refunded',
            null,
            'admin',
            { amount: event.amount, reason: event.reason },
          ),
        );
      } else if (event instanceof OrderDisputedEvent) {
        await this.commandBus.execute(
          new AppendAuditEventCommand(
            'order',
            event.orderId,
            'order.disputed',
            event.buyerId,
            'buyer',
            { disputeId: event.disputeId },
          ),
        );
      } else if (event instanceof EscrowFundedEvent) {
        await this.commandBus.execute(
          new AppendAuditEventCommand(
            'escrow',
            event.escrowId,
            'escrow.funded',
            null,
            'system',
            { orderId: event.orderId, amount: event.amount },
          ),
        );
      } else if (event instanceof EscrowReleasedEvent) {
        await this.commandBus.execute(
          new AppendAuditEventCommand(
            'escrow',
            event.escrowId,
            'escrow.released',
            null,
            'system',
            { orderId: event.orderId, amount: event.amount },
          ),
        );
      }
    } catch (err) {
      this.logger.error('Failed to append audit event', err);
    }
  }
}
