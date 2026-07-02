export class SupplierApprovedEvent {
  constructor(
    public readonly supplierId: string, // _id (UUID)
    public readonly userId: number, // auth user id (internal)
    public readonly companyName: string,
  ) {}

  static create(
    supplierId: string,
    userId: number,
    companyName: string,
  ): SupplierApprovedEvent {
    return new SupplierApprovedEvent(supplierId, userId, companyName);
  }
}
