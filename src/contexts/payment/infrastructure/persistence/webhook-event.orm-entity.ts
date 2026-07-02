import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('webhook_events')
export class WebhookEventOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64 })
  provider: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 128 })
  event_id: string;

  @Column({ type: 'boolean', default: false })
  signature_verified: boolean;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  processed_at: Date;
}
