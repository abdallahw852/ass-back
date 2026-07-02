import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { IClientReadRepository } from '../../../domain/client-read.repository.interface';
import { CLIENT_READ_REPOSITORY } from '../../../domain/client-read.repository.interface';
import { ClientNotFoundException } from '../../../domain/client.exceptions';
import { GetClientQuotationsQuery } from '../get-client-quotations.query';

@QueryHandler(GetClientQuotationsQuery)
export class GetClientQuotationsHandler implements IQueryHandler<GetClientQuotationsQuery> {
  constructor(
    @Inject(CLIENT_READ_REPOSITORY)
    private readonly repo: IClientReadRepository,
  ) {}

  async execute(query: GetClientQuotationsQuery) {
    const client = await this.repo.getClientHeader(
      query.supplierId,
      query.buyerPublicId,
    );
    if (!client) throw new ClientNotFoundException();

    const { items, total } = await this.repo.getClientQuotations(
      query.supplierId,
      client.buyerInternalId,
      query.page,
      query.limit,
    );

    return { items, total, page: query.page, limit: query.limit };
  }
}
