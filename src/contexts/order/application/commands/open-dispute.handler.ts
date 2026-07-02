import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { OpenDisputeCommand } from './open-dispute.command';
import type { ITradeOrderRepository } from '../../domain/order.repository.interface';
import { TRADE_ORDER_REPOSITORY } from '../../domain/order.repository.interface';
import {
  OrderAccessDeniedException,
  OrderNotFoundException,
} from '../../domain/order.exceptions';
import { OrderDisputedEvent } from '../../domain/events/order-disputed.event';
import { DisputeOrmEntity } from '../../../dispute/infrastructure/persistence/dispute.orm-entity';

@CommandHandler(OpenDisputeCommand)
export class OpenDisputeHandler implements ICommandHandler<OpenDisputeCommand> {
  constructor(
    @Inject(TRADE_ORDER_REPOSITORY)
    private readonly tradeOrderRepo: ITradeOrderRepository,
    @InjectRepository(DisputeOrmEntity, 'write')
    private readonly disputeRepo: Repository<DisputeOrmEntity>,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: OpenDisputeCommand): Promise<void> {
    const order = await this.tradeOrderRepo.findByPublicId(command.orderId);
    if (!order) throw new OrderNotFoundException(command.orderId);
    if (order.buyerId !== command.buyerId)
      throw new OrderAccessDeniedException(command.orderId);

    order.openDispute();
    await this.tradeOrderRepo.update(order);

    const dispute = this.disputeRepo.create({
      _id: randomUUID(),
      order_id: order.internalId!,
      opened_by_id: command.buyerId,
      reason: command.reason,
      status: 'open',
    });
    await this.disputeRepo.save(dispute);

    this.eventBus.publish(
      new OrderDisputedEvent(
        order.id,
        order.internalId!,
        order.buyerId,
        order.supplierId,
        dispute._id,
      ),
    );
  }
}
