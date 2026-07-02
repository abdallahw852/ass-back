export class LoginCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly ip: string,
    public readonly session: Record<string, unknown>,
    public readonly userAgent: string = '',
  ) {}
}
