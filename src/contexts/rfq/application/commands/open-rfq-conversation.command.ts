export class OpenRfqConversationAsBuyerCommand {
  constructor(
    public readonly rfqPublicId: string,
    public readonly supplierPublicId: string,
    public readonly buyerUserId: number,
  ) {}
}

export class OpenRfqConversationAsSupplierCommand {
  constructor(
    public readonly rfqPublicId: string,
    public readonly supplierUserId: number,
  ) {}
}
