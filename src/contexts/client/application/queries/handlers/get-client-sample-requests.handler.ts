import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { IClientReadRepository } from '../../../domain/client-read.repository.interface';
import { CLIENT_READ_REPOSITORY } from '../../../domain/client-read.repository.interface';
import { ClientNotFoundException } from '../../../domain/client.exceptions';
import { GetClientSampleRequestsQuery } from '../get-client-sample-requests.query';

// TODO(phase-2): implement when the sample-request context is built.
@QueryHandler(GetClientSampleRequestsQuery)
export class GetClientSampleRequestsHandler implements IQueryHandler<GetClientSampleRequestsQuery> {
  constructor(
    @Inject(CLIENT_READ_REPOSITORY)
    private readonly repo: IClientReadRepository,
  ) {}

  async execute(query: GetClientSampleRequestsQuery) {
    const client = await this.repo.getClientHeader(
      query.supplierId,
      query.buyerPublicId,
    );
    if (!client) throw new ClientNotFoundException();

    return { items: [], total: 0, page: 1, limit: 20 };
  }
}
