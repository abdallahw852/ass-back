import { randomUUID } from 'node:crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('audit_events')
export class AuditEventOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  _id: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  entity_type: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  entity_id: string;

  @Column({ type: 'varchar', length: 128 })
  event_name: string;

  @Column({ type: 'int', nullable: true })
  actor_id: number | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  actor_role: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  payload: Record<string, unknown>;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  correlation_id: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
  }
}
