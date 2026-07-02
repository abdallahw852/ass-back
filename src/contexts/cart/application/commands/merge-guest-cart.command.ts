export interface GuestCartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  targetPrice?: number;
  notes?: string;
}

export class MergeGuestCartCommand {
  constructor(
    public readonly buyerId: number,
    public readonly items: GuestCartItem[],
  ) {}
}
