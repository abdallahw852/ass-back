import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { IClientReadRepository } from '../../../domain/client-read.repository.interface';
import { CLIENT_READ_REPOSITORY } from '../../../domain/client-read.repository.interface';
import { ClientNotFoundException } from '../../../domain/client.exceptions';
import { GetClientChatThreadsQuery } from '../get-client-chat-threads.query';

// TODO(phase-2): implement when the messaging context (conversation entities) is built.
@QueryHandler(GetClientChatThreadsQuery)
export class GetClientChatThreadsHandler implements IQueryHandler<GetClientChatThreadsQuery> {
  constructor(
    @Inject(CLIENT_READ_REPOSITORY)
    private readonly repo: IClientReadRepository,
  ) {}

  async execute(query: GetClientChatThreadsQuery) {
    const client = await this.repo.getClientHeader(
      query.supplierId,
      query.buyerPublicId,
    );
    if (!client) throw new ClientNotFoundException();

    return { items: [], total: 0, page: 1, limit: 20 };
  }
}
