import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { randomUUID } from 'crypto';

@Entity('plans')
export class PlanOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  _id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  name: string;

  @Column({ type: 'varchar', length: 128 })
  displayNameAr: string;

  @Column({ type: 'varchar', length: 128 })
  displayNameEn: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: string;

  @Column({ type: 'varchar', length: 8, default: 'SAR' })
  currency: string;

  @Column({ type: 'varchar', length: 16, default: 'monthly' })
  billingCycle: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  platformPlanId: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  commissionRate: string;

  @Column({ type: 'jsonb', default: '[]' })
  features: string[];

  @Column({ type: 'jsonb', default: '{}' })
  entitlements: Record<string, boolean | number>;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
  }
}
