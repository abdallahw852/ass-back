import {
  Column,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('supplier_wallets')
export class SupplierWalletOrmEntity {
  @PrimaryColumn({ type: 'int' })
  supplier_id: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance: number;

  @Index()
  @Column({ type: 'varchar', length: 8, default: 'SAR' })
  currency: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
