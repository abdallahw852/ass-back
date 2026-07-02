import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { IClientReadRepository } from '../../../domain/client-read.repository.interface';
import { CLIENT_READ_REPOSITORY } from '../../../domain/client-read.repository.interface';
import { ClientNotFoundException } from '../../../domain/client.exceptions';
import { GetClientNotesQuery } from '../get-client-notes.query';

// TODO(phase-2): implement when client_notes table and write commands are built.
@QueryHandler(GetClientNotesQuery)
export class GetClientNotesHandler implements IQueryHandler<GetClientNotesQuery> {
  constructor(
    @Inject(CLIENT_READ_REPOSITORY)
    private readonly repo: IClientReadRepository,
  ) {}

  async execute(query: GetClientNotesQuery) {
    const client = await this.repo.getClientHeader(
      query.supplierId,
      query.buyerPublicId,
    );
    if (!client) throw new ClientNotFoundException();

    return { items: [], total: 0, page: 1, limit: 20 };
  }
}
