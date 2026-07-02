export class ApproveOrRejectProductCommand {
  constructor(
    public readonly productId: string,
    public readonly decision: 'approve' | 'reject',
    public readonly reason: string | null,
    public readonly actorId: number,
    public readonly actorRole: string,
  ) {}
}
