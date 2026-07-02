import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { QuotationStatus } from '../domain/rfq.types';

@Entity('quotations')
export class QuotationReadModel {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  _id: string;

  @Column({ type: 'int' })
  rfqId: number;

  @Column({ type: 'int' })
  supplierId: number;

  @Column({
    type: 'enum',
    enum: QuotationStatus,
    default: QuotationStatus.SUBMITTED,
  })
  status: QuotationStatus;

  @Column({ type: 'varchar', length: 255 })
  productName: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  weightKg: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  lengthCm: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  widthCm: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  heightCm: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unitPrice: number;

  @Column({ type: 'varchar', length: 8, default: 'SAR' })
  currency: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalPrice: number;

  @Column({ type: 'varchar', length: 64 })
  deliveryTimeDays: string;

  @Column({ type: 'varchar', length: 255 })
  paymentTerms: string;

  @Column({ type: 'timestamptz' })
  validUntil: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  shippingDetails: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  additionalNotes: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  supplierViewedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  buyerViewedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
