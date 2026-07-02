export class CheckoutOrderDraftCommand {
  constructor(
    public readonly draftId: string,
    public readonly buyerId: number,
  ) {}
}
