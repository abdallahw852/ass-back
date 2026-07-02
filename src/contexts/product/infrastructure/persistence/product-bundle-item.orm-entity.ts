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
} from 'typeorm';
import { randomUUID } from 'crypto';
import { ProductOrmEntity } from './product.orm-entity';

/**
 * ORM entity for the `product_bundle_items` table.
 *
 * Links child products to a parent bundle/group product.
 * The parent product must have type = 'bundle'.
 */
@Entity('product_bundle_items')
@Index(['parentProductId', 'childProductId'], { unique: true })
export class ProductBundleItemOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  _id: string;

  @Column({ type: 'int' })
  parentProductId: number;

  /** Public UUID of the child product included in the bundle. */
  @Column({ type: 'uuid' })
  childProductId: string;

  @ManyToOne(() => ProductOrmEntity, (p) => p.bundleItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parentProductId' })
  parentProduct: ProductOrmEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
  }
}
