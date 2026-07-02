import { StockMovementReason } from '../../domain/enums/stock-movement-reason.enum';

export class AdjustStockCommand {
  constructor(
    public readonly inventoryItemId: string,
    public readonly supplierId: number,
    public readonly value: number,
    public readonly reason: StockMovementReason,
    public readonly actorUserId: number,
    public readonly note?: string | null,
  ) {}
}
