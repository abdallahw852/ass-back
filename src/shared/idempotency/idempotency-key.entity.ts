import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity('idempotency_keys')
export class IdempotencyKeyOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  key: string;

  @Index()
  @Column({ type: 'int' })
  user_id: number;

  @Column({ type: 'varchar', length: 512 })
  route: string;

  @Column({ type: 'varchar', length: 64 })
  request_hash: string;

  @Column({ type: 'jsonb', nullable: true })
  response: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
