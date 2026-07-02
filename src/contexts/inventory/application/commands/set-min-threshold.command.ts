export class SetMinThresholdCommand {
  constructor(
    public readonly inventoryItemId: string,
    public readonly supplierId: number,
    public readonly threshold: number,
  ) {}
}
