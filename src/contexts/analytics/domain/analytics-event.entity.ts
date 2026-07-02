export class AnalyticsEvent {
  id: number;
  _id: string;
  eventType: string;
  path: string;
  userId?: number | null;
  sessionId: string;
  ip?: string | null;
  country?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}
