export interface TrackingEvent {
  timestamp: Date;
  status: string;
  description: string;
  location?: string;
}
