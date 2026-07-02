import { randomUUID } from 'node:crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CartSupplierGroupOrmEntity } from './cart-supplier-group.orm-entity';

@Entity('cart_attachments')
export class CartAttachmentOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: '_id', type: 'uuid', unique: true })
  _id: string;

  @Column({ name: 'supplier_group_id', type: 'int' })
  supplierGroupId: number;

  @ManyToOne(() => CartSupplierGroupOrmEntity, (group) => group.attachments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'supplier_group_id' })
  supplierGroup: CartSupplierGroupOrmEntity;

  @Column({ type: 'varchar', length: 512 })
  url: string;

  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 128 })
  mimeType: string;

  @Column({ type: 'int' })
  size: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
  }
}
