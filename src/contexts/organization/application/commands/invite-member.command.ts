export class InviteMemberCommand {
  constructor(
    public readonly supplierId: number,
    public readonly name: string,
    public readonly email: string,
    public readonly jobRole: string,
    public readonly permissions: string[],
  ) {}
}
