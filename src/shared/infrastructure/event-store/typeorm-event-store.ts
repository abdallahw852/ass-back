import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository, getDataSourceToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DomainEvent } from '../../domain/domain-event';
import {
  IEventStore,
  StoredEvent,
} from '../../application/event-store.interface';
import { EventStoreEntity } from './event-store.orm-entity';

/**
 * Concurrency exception for optimistic locking
 */
export class ConcurrencyException extends Error {
  constructor(
    aggregateId: string,
    expectedVersion: number,
    actualVersion: number,
  ) {
    super(
      `Concurrency conflict for aggregate ${aggregateId}. ` +
        `Expected version ${expectedVersion}, but found ${actualVersion}.`,
    );
    this.name = 'ConcurrencyException';
  }
}

/**
 * TypeORM implementation of the event store
 */
@Injectable()
export class TypeOrmEventStore implements IEventStore {
  private readonly dataSource: DataSource;

  constructor(
    @InjectRepository(EventStoreEntity, 'write')
    private readonly eventRepository: Repository<EventStoreEntity>,
    @Inject(getDataSourceToken('write'))
    writeDataSource: DataSource,
  ) {
    this.dataSource = writeDataSource;
  }

  /**
   * Append events to the event store with optimistic concurrency control
   */
  async appendEvents(
    aggregateId: string,
    aggregateType: string,
    events: DomainEvent[],
    expectedVersion: number,
  ): Promise<void> {
    if (events.length === 0) {
      return;
    }
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');
    try {
      const currentVersion = await this.getCurrentVersionInTransaction(
        queryRunner,
        aggregateId,
      );
      if (currentVersion !== expectedVersion) {
        throw new ConcurrencyException(
          aggregateId,
          expectedVersion,
          currentVersion,
        );
      }
      let version = expectedVersion;
      for (const event of events) {
        version++;
        const entity = queryRunner.manager.create(EventStoreEntity, {
          aggregateId,
          aggregateType,
          eventType: event.eventType,
          payload: event.toPayload(),
          version,
          occurredOn: event.occurredOn,
        });
        await queryRunner.manager.save(entity);
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get all events for an aggregate ordered by version
   */
  async getEvents(aggregateId: string): Promise<StoredEvent[]> {
    const entities = await this.eventRepository.find({
      where: { aggregateId },
      order: { version: 'ASC' },
    });
    return entities.map((entity) => this.toStoredEvent(entity));
  }

  /**
   * Get events starting from a specific version
   */
  async getEventsFromVersion(
    aggregateId: string,
    fromVersion: number,
  ): Promise<StoredEvent[]> {
    const entities = await this.eventRepository
      .createQueryBuilder('event')
      .where('event.aggregate_id = :aggregateId', { aggregateId })
      .andWhere('event.version > :fromVersion', { fromVersion })
      .orderBy('event.version', 'ASC')
      .getMany();
    return entities.map((entity) => this.toStoredEvent(entity));
  }

  /**
   * Get the current version of an aggregate
   */
  async getAggregateVersion(aggregateId: string): Promise<number> {
    const result = await this.eventRepository
      .createQueryBuilder('event')
      .select('MAX(event.version)', 'maxVersion')
      .where('event.aggregate_id = :aggregateId', { aggregateId })
      .getRawOne<{ maxVersion: number | null }>();
    return result?.maxVersion ?? 0;
  }

  /**
   * Get current version within a transaction
   */
  private async getCurrentVersionInTransaction(
    queryRunner: ReturnType<DataSource['createQueryRunner']>,
    aggregateId: string,
  ): Promise<number> {
    const result = await queryRunner.manager
      .createQueryBuilder(EventStoreEntity, 'event')
      .select('MAX(event.version)', 'maxVersion')
      .where('event.aggregate_id = :aggregateId', { aggregateId })
      .getRawOne<{ maxVersion: number | null }>();
    return result?.maxVersion ?? 0;
  }

  /**
   * Map entity to stored event
   */
  private toStoredEvent(entity: EventStoreEntity): StoredEvent {
    return {
      id: entity.id,
      aggregateId: entity.aggregateId,
      aggregateType: entity.aggregateType,
      eventType: entity.eventType,
      payload: entity.payload,
      version: entity.version,
      occurredOn: entity.occurredOn,
      createdAt: entity.createdAt,
    };
  }
}
