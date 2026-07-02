import { AggregateRoot as NestAggregateRoot } from '@nestjs/cqrs';
import { DomainEvent } from './domain-event';

export abstract class AggregateRoot extends NestAggregateRoot {
  protected readonly _id: string;
  protected _version = 0;
  private readonly _domainEvents: DomainEvent[] = [];

  protected constructor(id: string) {
    super();
    this._id = id;
  }

  get id(): string {
    return this._id;
  }

  get version(): number {
    return this._version;
  }

  getDomainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  clearDomainEvents(): void {
    this._domainEvents.length = 0;
  }

  protected applyEvent(event: DomainEvent): void {
    const handlerName = `on${event.eventType}`;
    const handler = (this as Record<string, unknown>)[handlerName];
    if (typeof handler === 'function') {
      (handler as (event: DomainEvent) => void).call(this, event);
    }
  }

  protected raiseEvent(event: DomainEvent): void {
    this.applyEvent(event);
    this._domainEvents.push(event);
    this._version += 1;
    this.apply(event);
  }

  loadFromHistory(events: DomainEvent[]): void {
    for (const event of events) {
      this.applyEvent(event);
      this._version += 1;
    }
  }

  abstract getAggregateType(): string;
}
