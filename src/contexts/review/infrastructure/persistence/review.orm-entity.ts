import { randomUUID } from 'node:crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('reviews')
export class ReviewOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: '_id', type: 'uuid', unique: true })
  _id: string;

  @Column({ name: 'product_id', type: 'int' })
  productId: number;

  @Column({ name: 'buyer_id', type: 'int' })
  buyerId: number;

  @Column({ type: 'smallint' })
  rating: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ type: 'jsonb', default: '[]' })
  images: string[];

  @Column({ name: 'is_verified_purchase', type: 'boolean', default: false })
  isVerifiedPurchase: boolean;

  @Column({ name: 'helpful_count', type: 'int', default: 0 })
  helpfulCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
  }
}
