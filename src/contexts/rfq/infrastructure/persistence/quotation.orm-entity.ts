import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';
import { SupplierOrmEntity } from '../../../supplier/identity/infrastructure/persistence/supplier.orm-entity';
import { QuotationStatus } from '../../domain/rfq.types';
import { RfqOrmEntity } from './rfq.orm-entity';
import { QuotationCustomizationOrmEntity } from './quotation-customization.orm-entity';

@Entity('quotations')
@Index(['rfqId', 'supplierId'])
export class QuotationOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  _id: string;

  @Column({ type: 'int' })
  rfqId: number;

  @ManyToOne(() => RfqOrmEntity, (rfq) => rfq.quotations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'rfqId' })
  rfq: RfqOrmEntity;

  @Column({ type: 'int' })
  supplierId: number;

  @ManyToOne(() => SupplierOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplierId' })
  supplier: SupplierOrmEntity;

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

  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentTerms: string | null;

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

  @OneToMany(
    () => QuotationCustomizationOrmEntity,
    (customization) => customization.quotation,
    {
      cascade: true,
      eager: true,
      orphanedRowAction: 'delete',
    },
  )
  customizations: QuotationCustomizationOrmEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
  }
}
