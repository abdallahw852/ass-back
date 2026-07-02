export class OrderCancelledEvent {
  constructor(
    public readonly orderId: string,
    public readonly shippingMethod: 'platform' | 'supplier',
  ) {}
}
