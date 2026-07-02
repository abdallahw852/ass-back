import { v4 as uuidv4 } from 'uuid';

export abstract class DomainEventBase {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  abstract readonly eventName: string;

  protected constructor(aggregateId: string) {
    this.eventId = uuidv4();
    this.occurredAt = new Date();
    this.aggregateId = aggregateId;
  }
}
