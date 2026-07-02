import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { randomUUID } from 'crypto';

@Entity('categories')
export class CategoryOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  _id: string;

  // ── Self-referencing tree ─────────────────────────────────

  @Column({ type: 'int', nullable: true })
  parentId: number | null;

  @ManyToOne(() => CategoryOrmEntity, (c) => c.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parentId' })
  parent: CategoryOrmEntity | null;

  @OneToMany(() => CategoryOrmEntity, (c) => c.parent, { eager: false })
  children: CategoryOrmEntity[];

  // ── Basic info ────────────────────────────────────────────

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nameAr: string | null;

  @Index({ unique: false })
  @Column({ type: 'varchar', length: 255 })
  slug: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  imageUrl: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  iconUrl: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // ── Display ───────────────────────────────────────────────

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'smallint', default: 0 })
  level: number;

  @Column({ type: 'int', default: 0 })
  productCount: number;

  // ── Timestamps ────────────────────────────────────────────

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date | null;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
  }
}
