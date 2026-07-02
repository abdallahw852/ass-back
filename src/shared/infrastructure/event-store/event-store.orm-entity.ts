import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * TypeORM entity for storing domain events
 */
@Entity('event_store')
@Index(['aggregateId', 'version'], { unique: true })
@Index(['aggregateId'])
@Index(['aggregateType'])
@Index(['eventType'])
@Index(['occurredOn'])
export class EventStoreEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('uuid', { name: 'aggregate_id' })
  aggregateId: string;

  @Column('varchar', { name: 'aggregate_type', length: 100 })
  aggregateType: string;

  @Column('varchar', { name: 'event_type', length: 100 })
  eventType: string;

  @Column('jsonb')
  payload: Record<string, unknown>;

  @Column('int')
  version: number;

  @Column('timestamp', { name: 'occurred_on' })
  occurredOn: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
