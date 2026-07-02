export class RemoveCartItemCommand {
  constructor(
    public readonly buyerId: number,
    public readonly itemId: string,
  ) {}
}
