export class CompleteProfileCommand {
  constructor(
    public readonly userId: string,
    public readonly name: string,
    public readonly phone: string,
    public readonly avatarUrl: string | null,
  ) {}
}
