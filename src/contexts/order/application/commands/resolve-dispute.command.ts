export type DisputeOutcome = 'buyer' | 'supplier';

export class ResolveDisputeCommand {
  constructor(
    public readonly disputeId: string,
    public readonly adminId: number,
    public readonly outcome: DisputeOutcome,
    public readonly note: string,
    public readonly refundAmount?: number,
  ) {}
}
