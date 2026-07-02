import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CommandBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { ITradeOrderRepository } from '../../../order/domain/order.repository.interface';
import { TRADE_ORDER_REPOSITORY } from '../../../order/domain/order.repository.interface';
import { DisputeOrmEntity } from '../../../dispute/infrastructure/persistence/dispute.orm-entity';
import { ReleaseOrderCommand } from '../../../order/application/commands/release-order.command';

@Injectable()
export class EscrowAutoReleaseCron {
  private readonly logger = new Logger(EscrowAutoReleaseCron.name);

  constructor(
    @Inject(TRADE_ORDER_REPOSITORY)
    private readonly tradeOrderRepo: ITradeOrderRepository,
    @InjectRepository(DisputeOrmEntity, 'write')
    private readonly disputeRepo: Repository<DisputeOrmEntity>,
    private readonly commandBus: CommandBus,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async releaseExpiredEscrows(): Promise<void> {
    const now = new Date();
    const orders = await this.tradeOrderRepo.findDeliveredForAutoRelease(now);

    for (const order of orders) {
      try {
        const openDispute = await this.disputeRepo.findOne({
          where: { order_id: order.internalId!, status: 'open' },
        });
        if (openDispute) continue;

        await this.commandBus.execute(
          new ReleaseOrderCommand(order.id, null, 'auto_release'),
        );
        this.logger.log(`Auto-released order ${order.id}`);
      } catch (err) {
        this.logger.error(`Failed to auto-release order ${order.id}`, err);
      }
    }
  }
}
