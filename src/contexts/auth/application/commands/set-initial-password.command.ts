export class SetInitialPasswordCommand {
  constructor(
    public readonly passwordSetupToken: string,
    public readonly password: string,
    public readonly session: Record<string, unknown>,
  ) {}
}
