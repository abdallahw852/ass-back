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

export type ReturnRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'refunded';

@Entity('return_requests')
export class ReturnRequestOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  _id: string;

  @Index()
  @Column({ type: 'int' })
  order_id: number;

  @Index()
  @Column({ type: 'int' })
  supplier_id: number;

  @Column({ type: 'int' })
  buyer_id: number;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status: ReturnRequestStatus;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total_amount: number;

  @Column({ type: 'int' })
  items_count: number;

  @Column({ type: 'varchar', length: 8, default: 'SAR' })
  currency: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  refund_amount: number | null;

  @Column({ type: 'int', nullable: true })
  reviewed_by_id: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  refunded_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
  }
}
