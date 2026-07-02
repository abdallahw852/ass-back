export class RemoveMemberCommand {
  constructor(
    public readonly memberId: string,
    public readonly supplierId: number,
  ) {}
}
