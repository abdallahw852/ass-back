export class ChangePasswordCommand {
  constructor(
    public readonly userId: number,
    public readonly currentPassword: string,
    public readonly newPassword: string,
  ) {}
}
