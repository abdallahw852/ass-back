import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListDisputesQuery } from './list-disputes.query';
import { DisputeOrmEntity } from '../../infrastructure/persistence/dispute.orm-entity';

export interface DisputeListItem {
  id: string;
  orderId: number;
  openedById: number;
  reason: string;
  status: string;
  resolvedById: number | null;
  resolutionNote: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
}

export interface ListDisputesResult {
  items: DisputeListItem[];
  total: number;
  page: number;
  limit: number;
}

@QueryHandler(ListDisputesQuery)
export class ListDisputesHandler implements IQueryHandler<
  ListDisputesQuery,
  ListDisputesResult
> {
  constructor(
    @InjectRepository(DisputeOrmEntity, 'write')
    private readonly disputeRepo: Repository<DisputeOrmEntity>,
  ) {}

  async execute(query: ListDisputesQuery): Promise<ListDisputesResult> {
    const qb = this.disputeRepo.createQueryBuilder('d');

    if (query.status) {
      qb.where('d.status = :status', { status: query.status });
    }

    const offset = (query.page - 1) * query.limit;
    qb.orderBy('d.created_at', 'DESC').skip(offset).take(query.limit);

    const [rows, total] = await qb.getManyAndCount();

    const items: DisputeListItem[] = rows.map(
      (d: DisputeOrmEntity): DisputeListItem => ({
        id: d._id,
        orderId: d.order_id,
        openedById: d.opened_by_id,
        reason: d.reason,
        status: d.status,
        resolvedById: d.resolved_by_id,
        resolutionNote: d.resolution_note,
        resolvedAt: d.resolved_at,
        createdAt: d.created_at,
      }),
    );

    return { items, total, page: query.page, limit: query.limit };
  }
}
