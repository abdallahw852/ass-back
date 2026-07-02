export class TrackEventCommand {
  constructor(
    public readonly eventType: string,
    public readonly path: string,
    public readonly sessionId: string,
    public readonly userId?: number | null,
    public readonly ip?: string | null,
    public readonly country?: string | null,
    public readonly referrer?: string | null,
    public readonly userAgent?: string | null,
    public readonly metadata: Record<string, unknown> = {},
  ) {}
}
