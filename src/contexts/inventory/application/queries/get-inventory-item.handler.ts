import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetInventoryItemQuery } from './get-inventory-item.query';
import { InventoryItemReadRepository } from '../../infrastructure/repositories/inventory-item-read.repository';
import { InventoryItemNotFoundException } from '../../domain/inventory.exceptions';

@QueryHandler(GetInventoryItemQuery)
export class GetInventoryItemHandler implements IQueryHandler<GetInventoryItemQuery> {
  constructor(private readonly readRepo: InventoryItemReadRepository) {}

  async execute(query: GetInventoryItemQuery) {
    const item = await this.readRepo.findDetail(
      query.inventoryItemId,
      query.supplierId,
    );
    if (!item) throw new InventoryItemNotFoundException(query.inventoryItemId);
    return item;
  }
}
