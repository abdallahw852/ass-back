export class AddPayoutMethodCommand {
  constructor(
    public readonly supplierId: number,
    public readonly type: string,
    public readonly bankName: string,
    public readonly accountName: string,
    public readonly iban: string,
  ) {}
}
