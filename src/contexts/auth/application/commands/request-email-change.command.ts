export class RequestEmailChangeCommand {
  constructor(
    public readonly userId: number,
    public readonly userPublicId: string,
    public readonly newEmail: string,
  ) {}
}
