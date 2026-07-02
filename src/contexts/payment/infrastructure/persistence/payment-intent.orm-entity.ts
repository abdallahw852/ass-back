import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ValueTransformer,
} from 'typeorm';
import { randomUUID } from 'crypto';

const decimalToNumberTransformer: ValueTransformer = {
  to: (value: number): number => value,
  from: (value: string | null): number | null => {
    if (value === null) {
      return null;
    }
    return parseFloat(value);
  },
};

@Entity('payment_records')
export class PaymentRecordOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  _id: string;

  @Column({ type: 'int' })
  supplierId: number;

  @Column({ type: 'int', nullable: true })
  subscriptionId: number | null;

  @Column({ type: 'int', nullable: true })
  planId: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentIntentId: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalToNumberTransformer,
  })
  amount: number;

  @Column({ type: 'varchar', length: 8, default: 'SAR' })
  currency: string;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  paymobOrderId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
  }
}
