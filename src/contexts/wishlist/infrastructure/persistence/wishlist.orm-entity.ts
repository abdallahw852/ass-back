import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('wishlists')
@Unique(['buyerId', 'productId'])
export class WishlistOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'buyer_id', type: 'int' })
  buyerId: number;

  @Column({ name: 'product_id', type: 'int' })
  productId: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
