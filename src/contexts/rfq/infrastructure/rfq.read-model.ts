import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RfqStatus, RfqType } from '../domain/rfq.types';

@Entity('rfqs')
export class RfqReadModel {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  _id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32, nullable: true })
  referenceNumber: string | null;

  @Column({ type: 'enum', enum: RfqType })
  type: RfqType;

  @Column({ type: 'enum', enum: RfqStatus, default: RfqStatus.OPEN })
  status: RfqStatus;

  @Column({ type: 'int' })
  buyerId: number;

  @Column({ type: 'int', nullable: true })
  productId: number | null;

  @Column({ type: 'int', nullable: true })
  targetSupplierId: number | null;

  @Column({ type: 'int', nullable: true })
  awardedQuotationId: number | null;

  @Column({ type: 'int', nullable: true })
  categoryId: number | null;

  @Column({ type: 'varchar', length: 255 })
  productName: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantity: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  quantityUnit: string | null;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'text', nullable: true })
  technicalSpecs: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  sampleReadiness: string | null;

  @Column({ type: 'date', nullable: true })
  requestedDeliveryDate: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  buyerViewedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  supplierViewedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
