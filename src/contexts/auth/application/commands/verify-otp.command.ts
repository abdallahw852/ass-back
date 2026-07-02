export class VerifyOtpCommand {
  constructor(
    public readonly email: string,
    public readonly code: string,
    public readonly session: Record<string, unknown>,
    public readonly accountType?: 'buyer' | 'supplier' | 'admin',
    public readonly requiredRole?: 'admin',
  ) {}
}
