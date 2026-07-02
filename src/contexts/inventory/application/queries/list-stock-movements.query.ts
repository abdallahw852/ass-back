import type { StockMovementReason } from '../../domain/enums/stock-movement-reason.enum';

export class ListStockMovementsQuery {
  constructor(
    public readonly inventoryItemId: string,
    public readonly supplierId: number,
    public readonly reason?: StockMovementReason,
    public readonly from?: Date,
    public readonly to?: Date,
    public readonly page: number = 1,
    public readonly pageSize: number = 20,
  ) {}
}
