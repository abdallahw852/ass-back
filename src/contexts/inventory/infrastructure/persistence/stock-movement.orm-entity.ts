import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { randomUUID } from 'node:crypto';
import { StockMovementReason } from '../../domain/enums/stock-movement-reason.enum';
import { InventoryItemOrmEntity } from './inventory-item.orm-entity';

@Entity('stock_movements')
export class StockMovementOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  _id: string;

  @Index()
  @Column({ type: 'int' })
  inventoryItemId: number;

  @Column({ type: 'int' })
  delta: number;

  @Column({ type: 'int' })
  balanceAfter: number;

  @Column({ type: 'enum', enum: StockMovementReason })
  reason: StockMovementReason;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'int' })
  actorUserId: number;

  @ManyToOne(() => InventoryItemOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inventoryItemId' })
  inventoryItem: InventoryItemOrmEntity;

  @CreateDateColumn({ type: 'timestamptz', name: 'occurredAt' })
  occurredAt: Date;

  @BeforeInsert()
  setDefaults(): void {
    this._id = this._id || randomUUID();
  }
}
