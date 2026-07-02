export class EscrowFrozenEvent {
  constructor(
    public readonly escrowId: string,
    public readonly orderId: string,
  ) {}
}
