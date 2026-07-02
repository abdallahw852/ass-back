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

@Entity('order_drafts')
export class OrderDraftOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  _id: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  referenceNumber: string | null;

  @Column({ type: 'int' })
  buyerId: number;

  @Column({ type: 'int' })
  supplierId: number;

  @Column({ type: 'varchar', length: 255 })
  rfqId: string;

  @Column({ type: 'varchar', length: 255 })
  quotationId: string;

  @Column({ type: 'varchar', length: 255 })
  productName: string;

  @Column({ type: 'jsonb', default: '[]' })
  items: Record<string, unknown>[];

  @Column({ type: 'varchar', length: 16, default: 'draft' })
  status: string;

  @Column({ type: 'varchar', length: 8, default: 'SAR' })
  currency: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @Column({ type: 'jsonb', default: '{}' })
  snapshot: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
  }
}
