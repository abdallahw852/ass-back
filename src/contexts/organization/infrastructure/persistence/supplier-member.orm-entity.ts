import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('supplier_members')
export class SupplierMemberOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', unique: true })
  _id: string;

  @Column({ type: 'int' })
  supplier_id: number;

  @Column({ type: 'varchar' })
  invited_email: string;

  @Column({ type: 'varchar' })
  invited_name: string;

  @Column({ type: 'varchar' })
  job_role: string;

  @Column({ type: 'jsonb' })
  permissions: string[];

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  invite_token: string;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: 'pending' | 'active';

  @Column({ type: 'int', nullable: true })
  user_id: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
    this.invite_token = this.invite_token || randomUUID();
    this.status = this.status || 'pending';
  }
}
