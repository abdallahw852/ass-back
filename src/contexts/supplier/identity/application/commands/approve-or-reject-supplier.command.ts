export class ApproveOrRejectSupplierCommand {
  constructor(
    public readonly supplierId: string,
    public readonly decision: 'approve' | 'reject',
    public readonly reason: string | undefined,
    public readonly actorId: number,
    public readonly actorRole: string,
  ) {}
}
