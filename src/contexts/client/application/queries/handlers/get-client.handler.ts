import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { IClientReadRepository } from '../../../domain/client-read.repository.interface';
import { CLIENT_READ_REPOSITORY } from '../../../domain/client-read.repository.interface';
import { ClientNotFoundException } from '../../../domain/client.exceptions';
import { GetClientQuery } from '../get-client.query';

@QueryHandler(GetClientQuery)
export class GetClientHandler implements IQueryHandler<GetClientQuery> {
  constructor(
    @Inject(CLIENT_READ_REPOSITORY)
    private readonly repo: IClientReadRepository,
  ) {}

  async execute(query: GetClientQuery) {
    const client = await this.repo.getClientHeader(
      query.supplierId,
      query.buyerPublicId,
    );
    if (!client) throw new ClientNotFoundException();

    return {
      id: client.buyerPublicId,
      name: client.name,
      company: client.company,
      email: client.email,
      avatar: client.avatar,
      country: client.country,
      joinedAt: client.joinedAt,
      initialsAvatarSeed: client.name?.charAt(0).toUpperCase() ?? 'U',
    };
  }
}
