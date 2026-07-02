import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { randomUUID } from 'crypto';
import {
  ProductCondition,
  ProductStatus,
  ProductType,
} from '../../domain/enums';
import { SupplierOrmEntity } from '../../../supplier/identity/infrastructure/persistence/supplier.orm-entity';
import { ProductVariantOrmEntity } from './product-variant.orm-entity';
import { ProductBundleItemOrmEntity } from './product-bundle-item.orm-entity';

/**
 * ORM entity for the `products` table.
 *
 * Represents all product types (ready, service, food, digital,
 * digital_card, bundle). Type-specific columns are nullable and
 * only populated for the matching product type.
 */
@Entity('products')
export class ProductOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  _id: string;

  // ── Supplier relation ───────────────────────────────────────

  @Column({ type: 'int' })
  supplierId: number;

  @ManyToOne(() => SupplierOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplierId' })
  supplier: SupplierOrmEntity;

  // ── Basic info ──────────────────────────────────────────────

  @Column({ type: 'enum', enum: ProductType, default: ProductType.READY })
  type: ProductType;

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.DRAFT })
  status: ProductStatus;

  // ── Approval / rejection fields ─────────────────────────────

  @Column({ type: 'varchar', length: 1000, nullable: true, default: null })
  rejectionReason: string | null;

  @Column({ type: 'timestamptz', nullable: true, default: null })
  reviewedAt: Date | null;

  @Column({ type: 'int', nullable: true, default: null })
  reviewedById: number | null;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nameAr: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 128, nullable: true })
  sku: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  descriptionAr: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  mainTitle: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  promotionalTitle: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  mainTitleAr: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  promotionalTitleAr: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  unitTypeAr: string | null;

  /** Up to 8 image URLs stored as JSON array. */
  @Column({ type: 'jsonb', nullable: false, default: '[]' })
  images: string[];

  // ── Categorisation ──────────────────────────────────────────

  @Column({ type: 'varchar', length: 255, nullable: true })
  categoryId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subcategoryId: string | null;

  // ── Pricing ─────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  costPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shippingPrice: number;

  @Column({ type: 'boolean', default: false })
  usePlatformShipping: boolean;

  @Column({ type: 'decimal', precision: 8, scale: 3, nullable: true })
  weightKg: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  discountedPrice: number | null;

  @Column({ type: 'smallint', nullable: true })
  discountPercentage: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  discountEndDate: Date | null;

  // ── Inventory ───────────────────────────────────────────────

  @Column({ type: 'int', default: 0 })
  stockQuantity: number;

  @Column({ type: 'int', default: 0 })
  maxPerCustomer: number;

  @Column({ type: 'boolean', default: false })
  trackInventory: boolean;

  @Column({ type: 'boolean', default: false })
  requiresShipping: boolean;

  // ── Multi-options ───────────────────────────────────────────

  /**
   * Custom key-value option groups.
   * Stored as JSON array: [{ name: "Material", values: ["Leather","Cotton"] }]
   */
  @Column({ type: 'jsonb', nullable: false, default: '[]' })
  optionGroups: { name: string; values: string[] }[];

  // ── Booking info (SERVICE / FOOD types) ─────────────────────

  @Column({ type: 'varchar', length: 64, nullable: true })
  bookingAvailableTime: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  bookingAvailableDate: Date | null;

  @Column({ type: 'int', nullable: true })
  bookingCapacity: number | null;

  // ── Digital product fields ──────────────────────────────────

  @Column({ type: 'varchar', length: 512, nullable: true })
  digitalFileUrl: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  digitalFileType: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  digitalFileSize: string | null;

  // ── Bundle fields ───────────────────────────────────────────

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  bundlePrice: number | null;

  // ── Buyer-facing fields ────────────────────────────────────

  @Column({ type: 'int', default: 1 })
  moq: number;

  @Column({ type: 'int', nullable: true })
  unitCount: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  unitType: string | null;

  @Column({
    type: 'enum',
    enum: ProductCondition,
    default: ProductCondition.NEW,
  })
  condition: ProductCondition;

  @Column({ type: 'varchar', length: 3, default: 'SAR' })
  currency: string;

  @Column({ type: 'jsonb', nullable: false, default: '[]' })
  attributes: { key: string; value: string; group?: string }[];

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  // ── Relations ───────────────────────────────────────────────

  @OneToMany(() => ProductVariantOrmEntity, (v) => v.product, {
    cascade: true,
    eager: false,
  })
  variants: ProductVariantOrmEntity[];

  @OneToMany(() => ProductBundleItemOrmEntity, (b) => b.parentProduct, {
    cascade: true,
    eager: false,
  })
  bundleItems: ProductBundleItemOrmEntity[];

  // ── Timestamps ──────────────────────────────────────────────

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
  }
}
