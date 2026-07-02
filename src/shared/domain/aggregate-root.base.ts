import { AggregateRoot as NestAggregateRoot } from '@nestjs/cqrs';
import { DomainEvent } from './domain-event.base';

/**
 * Base class for aggregate roots
 * Aggregates are clusters of domain objects treated as a single unit
 * They encapsulate business logic and emit domain events
 */
export abstract class AggregateRoot extends NestAggregateRoot {
  protected readonly _id: string;
  protected _version: number = 0;
  private readonly _domainEvents: DomainEvent[] = [];

  constructor(id: string) {
    super();
    this._id = id;
  }

  get id(): string {
    return this._id;
  }

  get version(): number {
    return this._version;
  }

  /**
   * Get all uncommitted domain events
   */
  getDomainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  /**
   * Clear all uncommitted domain events after persistence
   */
  clearDomainEvents(): void {
    this._domainEvents.length = 0;
  }

  /**
   * Add a domain event to the aggregate
   */
  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
    this._version++;
    this.apply(event);
  }

  /**
   * Load aggregate from event history (event sourcing)
   */
  loadFromHistory(events: DomainEvent[]): void {
    for (const event of events) {
      this.applyEvent(event);
      this._version++;
    }
  }

  /**
   * Apply an event to update aggregate state
   * Each aggregate must implement handlers for its events
   */
  protected applyEvent(event: DomainEvent): void {
    const handler = this.findEventHandler(event);
    if (handler) {
      handler.call(this, event);
    }
  }

  /**
   * Find the event handler method for a given event
   */
  private findEventHandler(
    event: DomainEvent,
  ): ((event: DomainEvent) => void) | undefined {
    const handlerName = `on${event.eventType}`;
    const handler = (this as Record<string, unknown>)[handlerName];
    if (typeof handler === 'function') {
      return handler as (event: DomainEvent) => void;
    }
    return undefined;
  }

  /**
   * Abstract method to get aggregate type name
   */
  abstract getAggregateType(): string;
}
