export class RejectWithdrawalCommand {
  constructor(
    public readonly withdrawalId: string,
    public readonly reason: string,
    public readonly adminId: number,
    public readonly adminRole: string,
  ) {}
}
