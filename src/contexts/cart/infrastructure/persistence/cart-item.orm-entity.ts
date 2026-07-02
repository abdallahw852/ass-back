import { randomUUID } from 'node:crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CartOrmEntity } from './cart.orm-entity';

@Entity('cart_items')
export class CartItemOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: '_id', type: 'uuid', unique: true })
  _id: string;

  @Column({ name: 'cart_id', type: 'int' })
  cartId: number;

  @ManyToOne(() => CartOrmEntity, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart: CartOrmEntity;

  @Column({ name: 'product_id', type: 'int' })
  productId: number;

  @Column({ name: 'product_public_id', type: 'uuid' })
  productPublicId: string;

  @Column({ name: 'variant_id', type: 'int', nullable: true })
  variantId: number | null;

  @Column({ name: 'variant_public_id', type: 'uuid', nullable: true })
  variantPublicId: string | null;

  @Column({ type: 'int' })
  quantity: number;

  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  unitPrice: number | null;

  @Column({
    name: 'target_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  targetPrice: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'supplier_id', type: 'int' })
  supplierId: number;

  @Column({ name: 'product_name', type: 'varchar', length: 255 })
  productName: string;

  @Column({
    name: 'product_image',
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  productImage: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
  }
}
