export class EscrowReleasedEvent {
  constructor(
    public readonly escrowId: string,
    public readonly orderId: string,
    public readonly supplierId: number,
    public readonly amount: number,
    public readonly currency: string,
  ) {}
}
