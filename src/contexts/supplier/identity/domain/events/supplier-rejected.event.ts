export class SupplierRejectedEvent {
  constructor(
    public readonly supplierId: string,
    public readonly userId: number,
    public readonly companyName: string,
    public readonly reason: string | null,
  ) {}

  static create(
    supplierId: string,
    userId: number,
    companyName: string,
    reason: string | null,
  ): SupplierRejectedEvent {
    return new SupplierRejectedEvent(supplierId, userId, companyName, reason);
  }
}
