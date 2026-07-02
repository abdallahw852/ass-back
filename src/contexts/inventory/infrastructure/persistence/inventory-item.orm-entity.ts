import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { randomUUID } from 'node:crypto';
import { ProductOrmEntity } from '../../../product/infrastructure/persistence/product.orm-entity';
import { ProductVariantOrmEntity } from '../../../product/infrastructure/persistence/product-variant.orm-entity';

// Two partial indexes instead of a single UNIQUE constraint because PostgreSQL
// treats NULLs as distinct in UNIQUE, which would allow duplicate rows for
// products without variants (variantId IS NULL).
@Index('UQ_inventory_product_no_variant', ['productId'], {
  unique: true,
  where: '"variantId" IS NULL',
})
@Index('UQ_inventory_product_variant', ['productId', 'variantId'], {
  unique: true,
  where: '"variantId" IS NOT NULL',
})
@Entity('inventory_items')
export class InventoryItemOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  _id: string;

  @Column({ type: 'int' })
  supplierId: number;

  @Column({ type: 'int' })
  productId: number;

  @Column({ type: 'int', nullable: true })
  variantId: number | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  sku: string | null;

  @Column({ type: 'int', default: 0 })
  onHand: number;

  @Column({ type: 'int', default: 0 })
  reservedQty: number;

  @Column({ type: 'int', default: 0 })
  minStockThreshold: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastMovementAt: Date | null;

  @ManyToOne(() => ProductOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: ProductOrmEntity;

  @ManyToOne(() => ProductVariantOrmEntity, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'variantId' })
  variant: ProductVariantOrmEntity | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
  }
}
