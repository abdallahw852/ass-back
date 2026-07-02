export class AddToCartCommand {
  constructor(
    public readonly buyerId: number,
    public readonly productId: string,
    public readonly quantity: number,
    public readonly variantId?: string,
    public readonly targetPrice?: number,
    public readonly notes?: string,
  ) {}
}
