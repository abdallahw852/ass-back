import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { ProductOrmEntity } from './product.orm-entity';

/**
 * ORM entity for the `product_variants` table.
 *
 * Each variant represents a purchasable SKU — a specific
 * colour / size combination within a parent product.
 * Variants have their own price, stock quantity, and active status.
 */
@Entity('product_variants')
@Index(['productId', 'color', 'size'], { unique: true })
export class ProductVariantOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  _id: string;

  @Column({ type: 'int' })
  productId: number;

  /** SKU auto-generated or manually assigned. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 128, nullable: true })
  sku: string | null;

  /** Hex colour code (e.g. "AF2E1B"), null if not colour-specific. */
  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string | null;

  /** Size label (e.g. "S", "M", "L", "XL"), null if not size-specific. */
  @Column({ type: 'varchar', length: 32, nullable: true })
  size: string | null;

  /** Arabic label for the size (e.g. "صغير", "وسط"). */
  @Column({ type: 'varchar', length: 32, nullable: true })
  sizeAr: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => ProductOrmEntity, (p) => p.variants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: ProductOrmEntity;

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
