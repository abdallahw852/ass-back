import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListStockMovementsQuery } from './list-stock-movements.query';
import { InventoryItemReadRepository } from '../../infrastructure/repositories/inventory-item-read.repository';

@QueryHandler(ListStockMovementsQuery)
export class ListStockMovementsHandler implements IQueryHandler<ListStockMovementsQuery> {
  constructor(private readonly readRepo: InventoryItemReadRepository) {}

  execute(query: ListStockMovementsQuery) {
    return this.readRepo.listMovements(
      query.inventoryItemId,
      query.supplierId,
      query.reason,
      query.from,
      query.to,
      query.page,
      query.pageSize,
    );
  }
}
