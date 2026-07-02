export class ListAuditEventsQuery {
  constructor(
    public readonly entityType?: string,
    public readonly entityId?: string,
    public readonly limit: number = 20,
    public readonly offset: number = 0,
    public readonly actorId?: number,
    public readonly action?: string,
    public readonly page: number = 1,
  ) {}
}
