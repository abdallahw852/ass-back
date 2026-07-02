export class ConfirmOrderReceiptCommand {
  constructor(
    public readonly orderId: string,
    public readonly buyerId: number,
  ) {}
}
