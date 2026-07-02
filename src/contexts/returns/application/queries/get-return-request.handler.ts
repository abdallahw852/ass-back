import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetReturnRequestQuery } from './get-return-request.query';
import { ReturnRequestOrmEntity } from '../../infrastructure/persistence/return-request.orm-entity';
import { UserOrmEntity } from '../../../auth/infrastructure/persistence/user.orm-entity';
import { TradeOrderOrmEntity } from '../../../order/infrastructure/persistence/trade-order.orm-entity';
import { ReturnRequestNotFoundException } from '../../domain/returns.exceptions';
import type { ReturnRequestReadModel } from './list-return-requests.handler';
import { mapReturnRequestRow } from './list-return-requests.handler';

@QueryHandler(GetReturnRequestQuery)
export class GetReturnRequestHandler implements IQueryHandler<
  GetReturnRequestQuery,
  ReturnRequestReadModel
> {
  constructor(
    @InjectRepository(ReturnRequestOrmEntity, 'write')
    private readonly returnRequestRepo: Repository<ReturnRequestOrmEntity>,
  ) {}

  async execute(query: GetReturnRequestQuery): Promise<ReturnRequestReadModel> {
    const row = await this.returnRequestRepo
      .createQueryBuilder('r')
      .leftJoin(UserOrmEntity, 'u', 'u.id = r.buyer_id')
      .leftJoin(TradeOrderOrmEntity, 'o', 'o.id = r.order_id')
      .select('r._id', 'r_id')
      .addSelect('r.status', 'r_status')
      .addSelect('r.total_amount', 'r_total_amount')
      .addSelect('r.refund_amount', 'r_refund_amount')
      .addSelect('r.items_count', 'r_items_count')
      .addSelect('r.reason', 'r_reason')
      .addSelect('r.created_at', 'r_created_at')
      .addSelect('o._id', 'order_public_id')
      .addSelect('u.name', 'buyer_name')
      .where('r._id = :returnId', { returnId: query.returnId })
      .andWhere('r.supplier_id = :supplierId', {
        supplierId: query.supplierId,
      })
      .getRawOne<Parameters<typeof mapReturnRequestRow>[0]>();

    if (!row) throw new ReturnRequestNotFoundException();

    return mapReturnRequestRow(row);
  }
}
