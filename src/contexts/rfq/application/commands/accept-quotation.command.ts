export class AcceptQuotationCommand {
  constructor(
    public readonly rfqId: string,
    public readonly quotationId: string,
    public readonly buyerId: number,
  ) {}
}
