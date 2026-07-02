export class ReleaseMilestoneCommand {
  constructor(
    public readonly orderId: string,
    public readonly orderInternalId: number,
    public readonly supplierId: number,
    public readonly amount: number,
    public readonly currency: string,
  ) {}
}
