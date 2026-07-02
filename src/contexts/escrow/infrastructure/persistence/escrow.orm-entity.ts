import { randomUUID } from 'node:crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type EscrowStatus = 'funded' | 'released' | 'refunded' | 'disputed';

@Entity('escrows')
export class EscrowOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  _id: string;

  @Index({ unique: true })
  @Column({ type: 'int' })
  order_id: number;

  @Column({ type: 'int' })
  supplier_id: number;

  @Column({ type: 'int' })
  buyer_id: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 8, default: 'SAR' })
  currency: string;

  @Column({ type: 'varchar', length: 16, default: 'funded' })
  status: EscrowStatus;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  provider_ref: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  funded_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  released_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  refunded_at: Date | null;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
  }
}
