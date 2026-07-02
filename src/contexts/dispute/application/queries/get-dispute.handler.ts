import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { GetDisputeQuery } from './get-dispute.query';
import { DisputeOrmEntity } from '../../infrastructure/persistence/dispute.orm-entity';
import type { DisputeListItem } from './list-disputes.handler';

@QueryHandler(GetDisputeQuery)
export class GetDisputeHandler implements IQueryHandler<
  GetDisputeQuery,
  DisputeListItem
> {
  constructor(
    @InjectRepository(DisputeOrmEntity, 'write')
    private readonly disputeRepo: Repository<DisputeOrmEntity>,
  ) {}

  async execute(query: GetDisputeQuery): Promise<DisputeListItem> {
    const d = await this.disputeRepo.findOne({
      where: { _id: query.disputeId },
    });
    if (!d)
      throw new NotFoundException({
        code: 'DISPUTE_NOT_FOUND',
        message: 'Dispute not found.',
      });

    return {
      id: d._id,
      orderId: d.order_id,
      openedById: d.opened_by_id,
      reason: d.reason,
      status: d.status,
      resolvedById: d.resolved_by_id,
      resolutionNote: d.resolution_note,
      resolvedAt: d.resolved_at,
      createdAt: d.created_at,
    };
  }
}
