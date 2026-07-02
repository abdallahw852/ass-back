export class EscrowFundedEvent {
  constructor(
    public readonly escrowId: string,
    public readonly orderId: string,
    public readonly buyerId: number,
    public readonly supplierId: number,
    public readonly amount: number,
    public readonly currency: string,
  ) {}
}
