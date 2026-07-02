import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResolveDisputeCommand } from './resolve-dispute.command';
import type { ITradeOrderRepository } from '../../domain/order.repository.interface';
import { TRADE_ORDER_REPOSITORY } from '../../domain/order.repository.interface';
import { OrderNotFoundException } from '../../domain/order.exceptions';
import { OrderReleasedEvent } from '../../domain/events/order-released.event';
import { OrderRefundedEvent } from '../../domain/events/order-refunded.event';
import { DisputeOrmEntity } from '../../../dispute/infrastructure/persistence/dispute.orm-entity';

@CommandHandler(ResolveDisputeCommand)
export class ResolveDisputeHandler implements ICommandHandler<ResolveDisputeCommand> {
  constructor(
    @Inject(TRADE_ORDER_REPOSITORY)
    private readonly tradeOrderRepo: ITradeOrderRepository,
    @InjectRepository(DisputeOrmEntity, 'write')
    private readonly disputeRepo: Repository<DisputeOrmEntity>,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: ResolveDisputeCommand): Promise<void> {
    const dispute = await this.disputeRepo.findOne({
      where: { _id: command.disputeId },
    });
    if (!dispute)
      throw new NotFoundException(`Dispute '${command.disputeId}' not found.`);

    const order = await this.tradeOrderRepo.findByPublicId(
      String(dispute.order_id),
    );
    if (!order) throw new OrderNotFoundException(String(dispute.order_id));

    const now = new Date();
    dispute.resolved_by_id = command.adminId;
    dispute.resolution_note = command.note;
    dispute.resolved_at = now;

    if (command.outcome === 'buyer') {
      dispute.status = 'resolved_buyer';
      order.refund();
      await this.disputeRepo.save(dispute);
      await this.tradeOrderRepo.update(order);
      const refundAmount = command.refundAmount ?? order.subtotal;
      this.eventBus.publish(
        new OrderRefundedEvent(
          order.id,
          order.internalId!,
          order.buyerId,
          order.supplierId,
          refundAmount,
          order.currency,
          command.note,
        ),
      );
    } else {
      dispute.status = 'resolved_supplier';
      order.release();
      await this.disputeRepo.save(dispute);
      await this.tradeOrderRepo.update(order);
      this.eventBus.publish(
        new OrderReleasedEvent(
          order.id,
          order.internalId!,
          order.buyerId,
          order.supplierId,
          order.subtotal,
          order.currency,
          'dispute_resolved_supplier',
        ),
      );
    }
  }
}
