export class CancelRfqCommand {
  constructor(
    public readonly rfqId: string,
    public readonly buyerId: number,
  ) {}
}
