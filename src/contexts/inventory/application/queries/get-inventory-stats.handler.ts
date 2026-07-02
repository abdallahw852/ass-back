import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetInventoryStatsQuery } from './get-inventory-stats.query';
import { InventoryItemReadRepository } from '../../infrastructure/repositories/inventory-item-read.repository';

@QueryHandler(GetInventoryStatsQuery)
export class GetInventoryStatsHandler implements IQueryHandler<GetInventoryStatsQuery> {
  constructor(private readonly readRepo: InventoryItemReadRepository) {}

  execute(query: GetInventoryStatsQuery) {
    return this.readRepo.stats(query.supplierId);
  }
}
