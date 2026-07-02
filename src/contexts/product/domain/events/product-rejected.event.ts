export class ProductRejectedEvent {
  constructor(
    public readonly productId: string,
    public readonly supplierId: number,
    public readonly productName: string,
    public readonly reason: string,
  ) {}

  static create(
    productId: string,
    supplierId: number,
    productName: string,
    reason: string,
  ): ProductRejectedEvent {
    return new ProductRejectedEvent(productId, supplierId, productName, reason);
  }
}
