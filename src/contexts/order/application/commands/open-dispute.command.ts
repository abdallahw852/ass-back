export class OpenDisputeCommand {
  constructor(
    public readonly orderId: string,
    public readonly buyerId: number,
    public readonly reason: string,
  ) {}
}
