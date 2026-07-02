import { randomUUID } from 'node:crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('invoices')
export class InvoiceOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  _id: string;

  @Index({ unique: true })
  @Column({ type: 'int' })
  order_id: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  invoice_number: string;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  pdf_url: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({ type: 'varchar', length: 8, default: 'SAR' })
  currency: string;

  @CreateDateColumn({ type: 'timestamptz' })
  issued_at: Date;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
  }
}
