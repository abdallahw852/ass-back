export class OrderShippedEvent {
  constructor(
    public readonly orderId: string,
    public readonly buyerId: number,
    public readonly supplierId: number,
  ) {}
}
