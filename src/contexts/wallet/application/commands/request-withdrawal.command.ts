export class RequestWithdrawalCommand {
  constructor(
    public readonly supplierId: number,
    public readonly amount: number,
    public readonly payoutMethodId: string,
  ) {}
}
