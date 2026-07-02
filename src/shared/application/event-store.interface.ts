import { DomainEvent } from '../domain/domain-event';

export interface StoredEvent {
  readonly id: number;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly eventType: string;
  readonly payload: Record<string, unknown>;
  readonly version: number;
  readonly occurredOn: Date;
  readonly createdAt: Date;
}

export interface IEventStore {
  appendEvents(
    aggregateId: string,
    aggregateType: string,
    events: DomainEvent[],
    expectedVersion: number,
  ): Promise<void>;
  getEvents(aggregateId: string): Promise<StoredEvent[]>;
  getEventsFromVersion(
    aggregateId: string,
    fromVersion: number,
  ): Promise<StoredEvent[]>;
  getAggregateVersion(aggregateId: string): Promise<number>;
}

export const EVENT_STORE = Symbol('EVENT_STORE');
