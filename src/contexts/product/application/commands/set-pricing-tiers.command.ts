export interface PricingTierInput {
  minQuantity: number;
  maxQuantity?: number | null;
  unitPrice: number;
}

export class SetPricingTiersCommand {
  constructor(
    public readonly productId: string,
    public readonly supplierId: number,
    public readonly tiers: PricingTierInput[],
  ) {}
}
