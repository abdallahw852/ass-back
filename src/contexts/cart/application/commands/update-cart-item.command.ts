export class UpdateCartItemCommand {
  constructor(
    public readonly buyerId: number,
    public readonly itemId: string,
    public readonly quantity?: number,
    public readonly targetPrice?: number | null,
    public readonly notes?: string | null,
  ) {}
}
