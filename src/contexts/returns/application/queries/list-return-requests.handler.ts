import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListReturnRequestsQuery } from './list-return-requests.query';
import { ReturnRequestOrmEntity } from '../../infrastructure/persistence/return-request.orm-entity';
import { UserOrmEntity } from '../../../auth/infrastructure/persistence/user.orm-entity';
import { TradeOrderOrmEntity } from '../../../order/infrastructure/persistence/trade-order.orm-entity';
import type { ReturnRequestStatus } from '../../infrastructure/persistence/return-request.orm-entity';

export interface ReturnRequestReadModel {
  id: string;
  orderId: string;
  customerName: string | null;
  date: Date;
  status: ReturnRequestStatus;
  totalAmount: number;
  items: number;
  reason: string;
}

export interface ListReturnRequestsResult {
  items: ReturnRequestReadModel[];
  total: number;
  page: number;
  limit: number;
}

interface RawReturnRequestRow {
  r_id: string;
  r_status: ReturnRequestStatus;
  r_total_amount: string;
  r_refund_amount: string | null;
  r_items_count: number;
  r_reason: string;
  r_created_at: Date;
  order_public_id: string;
  buyer_name: string | null;
}

export function mapReturnRequestRow(
  row: RawReturnRequestRow,
): ReturnRequestReadModel {
  return {
    id: row.r_id,
    orderId: row.order_public_id,
    customerName: row.buyer_name,
    date: row.r_created_at,
    status: row.r_status,
    totalAmount: Number(row.r_refund_amount ?? row.r_total_amount),
    items: row.r_items_count,
    reason: row.r_reason,
  };
}

@QueryHandler(ListReturnRequestsQuery)
export class ListReturnRequestsHandler implements IQueryHandler<
  ListReturnRequestsQuery,
  ListReturnRequestsResult
> {
  constructor(
    @InjectRepository(ReturnRequestOrmEntity, 'write')
    private readonly returnRequestRepo: Repository<ReturnRequestOrmEntity>,
  ) {}

  async execute(
    query: ListReturnRequestsQuery,
  ): Promise<ListReturnRequestsResult> {
    const qb = this.returnRequestRepo
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
      .where('r.supplier_id = :supplierId', { supplierId: query.supplierId });

    if (query.status) {
      qb.andWhere('r.status = :status', { status: query.status });
    }

    const total = await qb.getCount();

    const offset = (query.page - 1) * query.limit;
    const rows = await qb
      .orderBy('r.created_at', 'DESC')
      .limit(query.limit)
      .offset(offset)
      .getRawMany<RawReturnRequestRow>();

    return {
      items: rows.map(mapReturnRequestRow),
      total,
      page: query.page,
      limit: query.limit,
    };
  }
}
