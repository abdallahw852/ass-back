export class RequestOtpCommand {
  constructor(
    public readonly email: string,
    public readonly accountType?: 'buyer' | 'supplier' | 'admin',
  ) {}
}
