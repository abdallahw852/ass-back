import { randomUUID } from 'node:crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type DisputeStatus = 'open' | 'resolved_buyer' | 'resolved_supplier';

@Entity('disputes')
export class DisputeOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  _id: string;

  @Index()
  @Column({ type: 'int' })
  order_id: number;

  @Column({ type: 'int' })
  opened_by_id: number;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'varchar', length: 32, default: 'open' })
  status: DisputeStatus;

  @Column({ type: 'int', nullable: true })
  resolved_by_id: number | null;

  @Column({ type: 'text', nullable: true })
  resolution_note: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  resolved_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
  }
}
