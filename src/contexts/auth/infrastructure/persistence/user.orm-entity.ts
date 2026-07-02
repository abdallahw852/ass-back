import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SupplierOrmEntity } from '../../../supplier/identity/infrastructure/persistence/supplier.orm-entity';
import { UserRole } from '../../domain/enums/user-role.enum';

@Entity('users')
export class UserOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', unique: true })
  _id: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  name: string | null;

  @Column({ type: 'varchar', nullable: true, unique: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  avatar: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: 'active' | 'suspended';

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash: string | null;

  @Column({ type: 'boolean', default: false })
  requiresPasswordSetup: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  onboardingCompletedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastPasswordChangedAt: Date | null;

  @Index()
  @Column({ type: 'varchar', length: 8, nullable: true })
  country: string | null;

  @Column({ type: 'int', nullable: true })
  supplierId: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;

  @OneToOne(() => SupplierOrmEntity, (s) => s.user, { nullable: true })
  supplier: SupplierOrmEntity | null;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
    this.role = this.role || UserRole.USER;
    this.requiresPasswordSetup = this.requiresPasswordSetup ?? false;
    this.verifiedAt = this.verifiedAt ?? null;
    this.passwordHash = this.passwordHash ?? null;
  }
}
