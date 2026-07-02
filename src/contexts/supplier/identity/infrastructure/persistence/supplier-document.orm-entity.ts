import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { randomUUID } from 'crypto';

@Entity('supplier_documents')
export class SupplierDocumentOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  _id: string;

  @Column({ type: 'int' })
  supplierId: number;

  @Column({ type: 'varchar', length: 64 })
  documentType: string;

  @Column({ type: 'varchar', length: 255 })
  documentName: string;

  @Column({ type: 'varchar', length: 512 })
  fileUrl: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
  }
}
