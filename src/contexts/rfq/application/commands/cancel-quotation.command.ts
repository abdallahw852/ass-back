export class CancelQuotationCommand {
  constructor(
    public readonly quotationId: string,
    public readonly supplierUserId: number,
  ) {}
}
