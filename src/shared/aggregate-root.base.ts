import { v4 as uuidv4 } from 'uuid';
import { DomainEventBase } from './domain-event.base';

export abstract class AggregateRootBase {
  /** Internal auto-increment PK — never exposed in DTOs */
  id: number;

  /** Public UUID — used in all API responses */
  _id: string;

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;

  /** Optimistic locking version */
  version: number;

  private _domainEvents: DomainEventBase[] = [];

  protected constructor() {
    this._id = uuidv4();
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.deletedAt = null;
    this.version = 0;
  }

  protected addDomainEvent(event: DomainEventBase): void {
    this._domainEvents.push(event);
  }

  pullDomainEvents(): DomainEventBase[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }
}
