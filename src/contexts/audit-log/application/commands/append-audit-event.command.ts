export class AppendAuditEventCommand {
  constructor(
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly eventName: string,
    public readonly actorId: number | null,
    public readonly actorRole: string | null,
    public readonly payload: Record<string, unknown>,
    public readonly correlationId?: string,
  ) {}
}
