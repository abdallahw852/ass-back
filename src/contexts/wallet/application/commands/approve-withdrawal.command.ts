export class ApproveWithdrawalCommand {
  constructor(
    public readonly withdrawalId: string,
    public readonly adminId: number,
    public readonly adminRole: string,
  ) {}
}
