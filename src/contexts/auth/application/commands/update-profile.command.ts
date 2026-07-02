export class UpdateProfileCommand {
  constructor(
    public readonly userPublicId: string,
    public readonly input: {
      name?: string;
      phone?: string;
      avatarUrl?: string | null;
    },
  ) {}
}
