export class OrderPaidEvent {
  constructor(
    public readonly orderId: string,
    public readonly orderInternalId: number,
    public readonly buyerId: number,
    public readonly supplierId: number,
    public readonly amount: number,
    public readonly currency: string,
    public readonly providerRef: string | null,
    public readonly shippingMethod: 'platform' | 'supplier',
  ) {}
}
