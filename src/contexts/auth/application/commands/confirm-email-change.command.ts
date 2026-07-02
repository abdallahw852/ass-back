export class ConfirmEmailChangeCommand {
  constructor(
    public readonly userId: number,
    public readonly userPublicId: string,
    public readonly otpCode: string,
  ) {}
}
