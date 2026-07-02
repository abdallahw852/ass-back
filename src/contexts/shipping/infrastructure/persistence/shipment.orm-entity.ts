import { randomUUID } from 'node:crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('shipments')
export class ShipmentOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  _id: string;

  @Index({ unique: true })
  @Column({ type: 'int' })
  order_id: number;

  @Column({ type: 'varchar', length: 64 })
  carrier: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  tracking_number: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  tracking_url: string | null;

  @Index()
  @Column({ type: 'varchar', length: 128, nullable: true })
  vendor_order_id: string | null;

  @Column({ type: 'varchar', length: 32, default: 'label_created' })
  status: string;

  @Column({ type: 'jsonb', default: '[]' })
  events: Record<string, unknown>[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
  }
}
