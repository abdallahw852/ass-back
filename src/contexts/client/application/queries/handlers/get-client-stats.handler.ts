import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { IClientReadRepository } from '../../../domain/client-read.repository.interface';
import { CLIENT_READ_REPOSITORY } from '../../../domain/client-read.repository.interface';
import { ClientNotFoundException } from '../../../domain/client.exceptions';
import { CreditTermsVo } from '../../../domain/value-objects/credit-terms.vo';
import { GetClientStatsQuery } from '../get-client-stats.query';

@QueryHandler(GetClientStatsQuery)
export class GetClientStatsHandler implements IQueryHandler<GetClientStatsQuery> {
  constructor(
    @Inject(CLIENT_READ_REPOSITORY)
    private readonly repo: IClientReadRepository,
  ) {}

  async execute(query: GetClientStatsQuery) {
    const client = await this.repo.getClientHeader(
      query.supplierId,
      query.buyerPublicId,
    );
    if (!client) throw new ClientNotFoundException();

    const stats = await this.repo.getClientStats(
      query.supplierId,
      client.buyerInternalId,
    );

    const { creditLimitSar } = CreditTermsVo.defaultTerms();

    return {
      totalOrders: stats.totalOrders,
      lifetimeValueSar: stats.lifetimeValueSar,
      creditLimitSar,
      // TODO(phase-2): calculate response rate from messaging context
      responseRate: null,
    };
  }
}
