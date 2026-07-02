export class MarkOrderShippedByPlatformCommand {
  constructor(
    public readonly orderId: string,
    public readonly carrier: string,
    public readonly trackingNumber: string,
    public readonly trackingUrl: string | null,
  ) {}
}
