export class OrderDeliveredEvent {
  constructor(
    public readonly orderId: string,
    public readonly buyerId: number,
    public readonly supplierId: number,
    public readonly autoReleaseAt: Date,
  ) {}
}
