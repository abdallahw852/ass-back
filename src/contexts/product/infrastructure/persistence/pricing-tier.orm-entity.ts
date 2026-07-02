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
import { randomUUID } from 'crypto';
import { ProductOrmEntity } from './product.orm-entity';

/**
 * ORM entity for the `pricing_tiers` table.
 *
 * Each row represents one quantity-based price break for a product.
 * E.g. "buy 10–19 units at 8.50 SAR each, 20+ at 7.00 SAR each."
 * Tiers are replaced atomically via {@link SetPricingTiersHandler}.
 */
@Entity('pricing_tiers')
export class PricingTierOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  _id: string;

  @Index()
  @Column({ type: 'int' })
  productId: number;

  @ManyToOne(() => ProductOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: ProductOrmEntity;

  @Column({ type: 'int' })
  minQuantity: number;

  @Column({ type: 'int', nullable: true })
  maxQuantity: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: 'varchar', length: 3, default: 'SAR' })
  currency: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
  }
}
