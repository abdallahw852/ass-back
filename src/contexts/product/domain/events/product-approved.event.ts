export class ProductApprovedEvent {
  constructor(
    public readonly productId: string, // _id (UUID)
    public readonly supplierId: number, // internal supplier id
    public readonly productName: string,
  ) {}

  static create(
    productId: string,
    supplierId: number,
    productName: string,
  ): ProductApprovedEvent {
    return new ProductApprovedEvent(productId, supplierId, productName);
  }
}
