export class SubmitProductForApprovalCommand {
  constructor(
    public readonly productId: string,
    public readonly supplierId: number,
  ) {}
}
