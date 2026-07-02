import { randomUUID } from 'node:crypto';

/**
 * Base class for all domain events
 * Domain events represent something that happened in the domain
 */
export abstract class DomainEvent {
  readonly eventId: string;
  readonly occurredOn: Date;
  readonly eventType: string;

  constructor(
    public readonly aggregateId: string,
    public readonly aggregateType: string,
  ) {
    this.eventId = randomUUID();
    this.occurredOn = new Date();
    this.eventType = this.constructor.name;
  }

  /**
   * Serialize event data for storage
   */
  abstract toPayload(): object;
}
