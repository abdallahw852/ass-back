export class RegisterUserCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly accountType: 'buyer' | 'supplier',
    public readonly name: string,
    public readonly phone: string,
    public readonly avatarUrl: string | null,
  ) {}
}
