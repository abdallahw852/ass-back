import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { UserOrmEntity } from '../../../auth/infrastructure/persistence/user.orm-entity';
import { CategoryOrmEntity } from '../../../category/infrastructure/persistence/category.orm-entity';
import { ProductOrmEntity } from '../../../product/infrastructure/persistence/product.orm-entity';
import { SupplierOrmEntity } from '../../../supplier/identity/infrastructure/persistence/supplier.orm-entity';
import { RfqAttachmentOrmEntity } from './rfq-attachment.orm-entity';
import { RfqCustomizationOrmEntity } from './rfq-customization.orm-entity';
import { QuotationOrmEntity } from './quotation.orm-entity';
import { RfqStatus, RfqType } from '../../domain/rfq.types';

@Entity('rfqs')
export class RfqOrmEntity {
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

  @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buyerId' })
  buyer: UserOrmEntity;

  @Column({ type: 'int', nullable: true })
  productId: number | null;

  @ManyToOne(() => ProductOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productId' })
  product: ProductOrmEntity | null;

  @Column({ type: 'int', nullable: true })
  targetSupplierId: number | null;

  @ManyToOne(() => SupplierOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'targetSupplierId' })
  targetSupplier: SupplierOrmEntity | null;

  @Column({ type: 'int', nullable: true })
  awardedQuotationId: number | null;

  @Column({ type: 'int', nullable: true })
  categoryId: number | null;

  @ManyToOne(() => CategoryOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category: CategoryOrmEntity | null;

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

  @OneToMany(
    () => RfqCustomizationOrmEntity,
    (customization) => customization.rfq,
    {
      cascade: true,
      eager: true,
    },
  )
  customizations: RfqCustomizationOrmEntity[];

  @OneToMany(() => RfqAttachmentOrmEntity, (attachment) => attachment.rfq, {
    cascade: true,
    eager: true,
  })
  attachments: RfqAttachmentOrmEntity[];

  @OneToMany(() => QuotationOrmEntity, (quotation) => quotation.rfq, {
    cascade: false,
    eager: false,
  })
  quotations: QuotationOrmEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
  }
}
