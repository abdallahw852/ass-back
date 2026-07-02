import { randomUUID } from 'node:crypto';
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
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { CartOrmEntity } from './cart.orm-entity';
import { CartAttachmentOrmEntity } from './cart-attachment.orm-entity';

export interface ShippingDestination {
  country: string;
  city: string;
  line1?: string;
  postalCode?: string;
  torodCityId?: number;
}

export interface SelectedShippingOption {
  courierPartnerId: number;
  courierName: string;
  price: number;
  eta?: string;
  type?: string;
  isOwn?: boolean;
}

export type CartShippingMethod = 'platform' | 'supplier';

@Entity('cart_supplier_groups')
@Unique(['cartId', 'supplierId'])
export class CartSupplierGroupOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: '_id', type: 'uuid', unique: true })
  _id: string;

  @Column({ name: 'cart_id', type: 'int' })
  cartId: number;

  @ManyToOne(() => CartOrmEntity, (cart) => cart.supplierGroups, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cart_id' })
  cart: CartOrmEntity;

  @Index()
  @Column({ name: 'supplier_id', type: 'int' })
  supplierId: number;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ name: 'shipping_destination', type: 'jsonb', nullable: true })
  shippingDestination: ShippingDestination | null;

  @Column({
    name: 'shipping_method',
    type: 'varchar',
    length: 16,
    default: 'supplier',
  })
  shippingMethod: CartShippingMethod;

  @Column({ name: 'selected_shipping_option', type: 'jsonb', nullable: true })
  selectedShippingOption: SelectedShippingOption | null;

  @OneToMany(
    () => CartAttachmentOrmEntity,
    (attachment) => attachment.supplierGroup,
    { cascade: true, eager: true },
  )
  attachments: CartAttachmentOrmEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
  }
}
