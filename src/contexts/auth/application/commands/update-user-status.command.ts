export class UpdateUserStatusCommand {
  constructor(
    public readonly targetUserId: string,
    public readonly status: 'active' | 'suspended',
    public readonly reason: string | undefined,
    public readonly actorId: number,
    public readonly actorRole: string,
  ) {}
}
