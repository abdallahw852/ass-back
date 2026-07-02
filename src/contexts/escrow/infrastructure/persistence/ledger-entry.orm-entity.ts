import { randomUUID } from 'node:crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type AccountKind =
  | 'platform_cash'
  | 'escrow_liability'
  | 'supplier_wallet'
  | 'buyer_refund'
  | 'platform_revenue';

export type EntryDirection = 'debit' | 'credit';

export type EntryKind =
  | 'payment_in'
  | 'escrow_hold'
  | 'escrow_release'
  | 'refund_out'
  | 'adjustment'
  | 'platform_commission';

@Entity('ledger_entries')
export class LedgerEntryOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  _id: string;

  @Index()
  @Column({ type: 'int' })
  order_id: number;

  @Index()
  @Column({ type: 'int', nullable: true })
  escrow_id: number | null;

  @Column({ type: 'varchar', length: 32 })
  account_kind: AccountKind;

  @Column({ type: 'int', nullable: true })
  account_owner_id: number | null;

  @Column({ type: 'varchar', length: 8 })
  direction: EntryDirection;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 8, default: 'SAR' })
  currency: string;

  @Column({ type: 'varchar', length: 32 })
  kind: EntryKind;

  @Index()
  @Column({ type: 'uuid' })
  correlation_id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  posted_at: Date;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
  }
}
