export type InventoryStatusFilter = 'all' | 'available' | 'low' | 'out';

export class ListInventoryItemsQuery {
  constructor(
    public readonly supplierId: number,
    public readonly status: InventoryStatusFilter = 'all',
    public readonly search?: string,
    public readonly page: number = 1,
    public readonly pageSize: number = 20,
  ) {}
}
