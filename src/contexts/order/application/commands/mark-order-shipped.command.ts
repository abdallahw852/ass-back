export class MarkOrderShippedCommand {
  constructor(
    public readonly orderId: string,
    public readonly supplierId: number,
    public readonly carrier: string,
    public readonly trackingNumber: string,
    public readonly trackingUrl?: string | null,
  ) {}
}
