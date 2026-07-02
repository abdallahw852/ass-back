export class ReleaseOrderCommand {
  constructor(
    public readonly orderId: string,
    public readonly actorId: number | null,
    public readonly reason: 'auto_release' | 'admin_override',
  ) {}
}
