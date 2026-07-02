import { randomUUID } from 'node:crypto';

export abstract class DomainEvent {
  readonly eventId: string;
  readonly occurredOn: Date;
  readonly eventType: string;

  protected constructor(
    public readonly aggregateId: string,
    public readonly aggregateType: string,
    public readonly version: number,
  ) {
    this.eventId = randomUUID();
    this.occurredOn = new Date();
    this.eventType = this.constructor.name;
  }

  abstract toPayload(): Record<string, unknown>;
}
