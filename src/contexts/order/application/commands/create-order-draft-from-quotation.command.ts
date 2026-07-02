export class CreateOrderDraftFromQuotationCommand {
  constructor(
    public readonly buyerId: number,
    public readonly supplierId: number,
    public readonly rfqId: string,
    public readonly quotationId: string,
    public readonly productName: string,
    public readonly quantity: number,
    public readonly unitPrice: number,
    public readonly totalPrice: number,
    public readonly currency: string,
    public readonly items: Record<string, unknown>[],
    public readonly snapshot: Record<string, unknown>,
  ) {}
}
