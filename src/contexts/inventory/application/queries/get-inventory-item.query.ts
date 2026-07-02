export class GetInventoryItemQuery {
  constructor(
    public readonly inventoryItemId: string,
    public readonly supplierId: number,
  ) {}
}
