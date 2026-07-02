import { randomUUID } from 'node:crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CartItemOrmEntity } from './cart-item.orm-entity';
import { CartSupplierGroupOrmEntity } from './cart-supplier-group.orm-entity';

@Entity('carts')
export class CartOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: '_id', type: 'uuid', unique: true })
  _id: string;

  @Column({ name: 'buyer_id', type: 'int', unique: true })
  buyerId: number;

  @OneToMany(() => CartItemOrmEntity, (item) => item.cart, {
    cascade: true,
    eager: true,
  })
  items: CartItemOrmEntity[];

  @OneToMany(() => CartSupplierGroupOrmEntity, (group) => group.cart, {
    cascade: true,
    eager: true,
  })
  supplierGroups: CartSupplierGroupOrmEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
  }
}
