import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum LoginActivityStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity('login_activities')
@Index('ix_login_activities_user_created', ['userId', 'createdAt'])
export class LoginActivityOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  _id: string;

  @Index()
  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'varchar', length: 45 })
  ipAddress: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string | null;

  @Column({ type: 'text' })
  userAgent: string;

  @Column({ type: 'varchar', length: 128 })
  device: string;

  @Column({ type: 'enum', enum: LoginActivityStatus })
  status: LoginActivityStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  failureReason: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
  }
}
