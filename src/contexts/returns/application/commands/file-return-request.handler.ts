import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileReturnRequestCommand } from './file-return-request.command';
import type { ITradeOrderRepository } from '../../../order/domain/order.repository.interface';
import { TRADE_ORDER_REPOSITORY } from '../../../order/domain/order.repository.interface';
import { ReturnRequestOrmEntity } from '../../infrastructure/persistence/return-request.orm-entity';
import { UserOrmEntity } from '../../../auth/infrastructure/persistence/user.orm-entity';
import { OrderNotFoundForReturnException } from '../../domain/returns.exceptions';
import type { ReturnRequestReadModel } from '../queries/list-return-requests.handler';

@CommandHandler(FileReturnRequestCommand)
export class FileReturnRequestHandler implements ICommandHandler<
  FileReturnRequestCommand,
  ReturnRequestReadModel
> {
  constructor(
    @Inject(TRADE_ORDER_REPOSITORY)
    private readonly tradeOrderRepo: ITradeOrderRepository,
    @InjectRepository(ReturnRequestOrmEntity, 'write')
    private readonly returnRequestRepo: Repository<ReturnRequestOrmEntity>,
    @InjectRepository(UserOrmEntity, 'write')
    private readonly userRepo: Repository<UserOrmEntity>,
  ) {}

  async execute(
    command: FileReturnRequestCommand,
  ): Promise<ReturnRequestReadModel> {
    const order = await this.tradeOrderRepo.findByPublicId(command.orderId);
    if (!order || order.supplierId !== command.supplierId) {
      throw new OrderNotFoundForReturnException();
    }

    const entity = this.returnRequestRepo.create({
      order_id: order.internalId!,
      supplier_id: command.supplierId,
      buyer_id: order.buyerId,
      reason: command.reason,
      status: 'pending',
      total_amount: order.subtotal,
      currency: order.currency,
      items_count: order.lines.length,
    });

    const saved = await this.returnRequestRepo.save(entity);

    const buyer = await this.userRepo.findOne({
      where: { id: order.buyerId },
    });

    return {
      id: saved._id,
      orderId: order.id,
      customerName: buyer?.name ?? null,
      date: saved.created_at,
      status: saved.status,
      totalAmount: Number(saved.total_amount),
      items: saved.items_count,
      reason: saved.reason,
    };
  }
}
