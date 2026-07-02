import { Inject } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import type { IRfqReadRepository } from '../../../domain/rfq-read.repository.interface';
import { RFQ_READ_REPOSITORY } from '../../../domain/rfq-read.repository.interface';
import { ListBuyerRfqsQuery } from '../list-buyer-rfqs.query';

@QueryHandler(ListBuyerRfqsQuery)
export class ListBuyerRfqsHandler implements IQueryHandler<ListBuyerRfqsQuery> {
  constructor(
    @Inject(RFQ_READ_REPOSITORY)
    private readonly rfqReadRepository: IRfqReadRepository,
  ) {}

  execute(
    query: ListBuyerRfqsQuery,
  ): Promise<{ items: Record<string, unknown>[]; total: number }> {
    return this.rfqReadRepository.listBuyerRfqs({
      buyerId: query.buyerId,
      status: query.filters.status,
      page: query.filters.page,
      limit: query.filters.limit,
    });
  }
}
