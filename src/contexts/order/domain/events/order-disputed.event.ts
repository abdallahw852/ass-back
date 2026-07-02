export class OrderDisputedEvent {
  constructor(
    public readonly orderId: string,
    public readonly orderInternalId: number,
    public readonly buyerId: number,
    public readonly supplierId: number,
    public readonly disputeId: string,
  ) {}
}
