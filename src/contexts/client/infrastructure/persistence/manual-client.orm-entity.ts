import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { CountryCode } from '../../domain/enums/country-code.enum';
import { ClientClassification } from '../../domain/value-objects/client-classification.vo';
import { SupplierOrmEntity } from '../../../supplier/identity/infrastructure/persistence/supplier.orm-entity';

/**
 * ORM entity for the `manual_clients` table.
 *
 * Manually-added contacts/leads, scoped to a supplier. Coexist with
 * order-derived clients (buyers with paid/fulfilled trade orders).
 */
@Entity('manual_clients')
export class ManualClientOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  _id: string;

  @Column({ type: 'int' })
  supplierId: number;

  @ManyToOne(() => SupplierOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplierId' })
  supplier: SupplierOrmEntity;

  @Column({ type: 'varchar', length: 255 })
  companyName: string;

  @Column({ type: 'varchar', length: 255 })
  fullName: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 32 })
  phone: string;

  @Column({ type: 'enum', enum: CountryCode })
  country: CountryCode;

  @Column({
    type: 'enum',
    enum: ClientClassification,
    default: ClientClassification.NEW,
  })
  classification: ClientClassification;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  creditLimitSar: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  paymentTerms: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
  }
}
