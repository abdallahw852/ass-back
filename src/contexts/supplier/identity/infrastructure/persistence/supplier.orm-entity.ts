import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { UserOrmEntity } from '../../../../auth/infrastructure/persistence/user.orm-entity';
import { SupplierVerificationStatus } from '../../domain/enums/supplier-verification-status.enum';
import { SupplierType } from '../../domain/enums/supplier-type.enum';

@Entity('suppliers')
export class SupplierOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  _id: string;

  @Column({ type: 'int' })
  userId: number;

  @OneToOne(() => UserOrmEntity, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'userId' })
  user: UserOrmEntity;

  @Column({ type: 'varchar', length: 255 })
  companyName: string;

  @Column({ type: 'varchar', length: 32 })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 64 })
  country: string;

  @Column({ type: 'varchar', length: 128 })
  activityType: string;

  @Column({ type: 'varchar', length: 64 })
  businessSize: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 128 })
  registrationNumber: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  registrationFileUrl: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // --- Complete profile fields (بيانات التوثيق) ---

  @Column({ type: 'varchar', length: 255, nullable: true })
  companyNameAr: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  companyNameEn: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  taxNumber: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ownerName: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  nationalId: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  city: string | null;

  @Column({ type: 'text', nullable: true })
  detailedAddress: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  logoUrl: string | null;

  @Column({ type: 'jsonb', nullable: false, default: '[]' })
  galleryUrls: string[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  bankName: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  iban: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  accountHolderName: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  businessDescription: string | null;

  @Column({ type: 'int', nullable: true })
  yearEstablished: number | null;

  @Column({
    type: 'numeric',
    precision: 9,
    scale: 6,
    nullable: true,
    transformer: {
      from: (v: string | null) => (v !== null ? parseFloat(v) : null),
      to: (v: number | null) => v,
    },
  })
  latitude: number | null;

  @Column({
    type: 'numeric',
    precision: 9,
    scale: 6,
    nullable: true,
    transformer: {
      from: (v: string | null) => (v !== null ? parseFloat(v) : null),
      to: (v: number | null) => v,
    },
  })
  longitude: number | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32, nullable: true })
  supplierCode: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  supplierType: SupplierType | null;

  @Column({
    type: 'enum',
    enum: SupplierVerificationStatus,
    default: SupplierVerificationStatus.PENDING,
  })
  verificationStatus: SupplierVerificationStatus;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
    this.isVerified = this.isVerified ?? false;
  }
}
