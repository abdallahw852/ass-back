import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListInventoryItemsQuery } from './list-inventory-items.query';
import { InventoryItemReadRepository } from '../../infrastructure/repositories/inventory-item-read.repository';

@QueryHandler(ListInventoryItemsQuery)
export class ListInventoryItemsHandler implements IQueryHandler<ListInventoryItemsQuery> {
  constructor(private readonly readRepo: InventoryItemReadRepository) {}

  async execute(query: ListInventoryItemsQuery) {
    const { data, total } = await this.readRepo.list(
      query.supplierId,
      query.status,
      query.search,
      query.page,
      query.pageSize,
    );
    return { data, total, page: query.page, pageSize: query.pageSize };
  }
}
