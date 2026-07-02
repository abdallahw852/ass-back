import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('trade_orders')
export class TradeOrderOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  _id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32, nullable: true })
  reference_number: string | null;

  @Column({ type: 'int' })
  buyer_id: number;

  @Column({ type: 'int' })
  supplier_id: number;

  @Column({ type: 'jsonb', default: '[]' })
  lines: Record<string, unknown>[];

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  shipping_cost: number;

  @Column({ type: 'varchar', length: 8, default: 'SAR' })
  currency: string;

  @Column({ type: 'varchar', length: 32, default: 'pending_payment' })
  status: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  rfq_id: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  client_secret: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  payment_intent_id: string | null;

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  paymob_order_id: string | null;

  @Column({ type: 'jsonb', default: '[]' })
  cart_item_ids: string[];

  @Column({ type: 'varchar', length: 16, default: 'supplier' })
  shipping_method: 'platform' | 'supplier';

  @Column({ type: 'jsonb', nullable: true })
  platform_shipping_snapshot: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  carrier: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  tracking_number: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  tracking_url: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  shipped_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  delivered_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  released_at: Date | null;

  @Index()
  @Column({ type: 'timestamptz', nullable: true })
  auto_release_at: Date | null;

  @Column({ type: 'int', default: 14 })
  protection_window_days: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
  }
}
