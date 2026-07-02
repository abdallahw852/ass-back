export class CheckoutCartCommand {
  constructor(
    public readonly buyerId: number,
    public readonly itemIds: string[] = [],
  ) {}
}
