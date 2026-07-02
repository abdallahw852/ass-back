import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RfqOrmEntity } from './rfq.orm-entity';

@Entity('rfq_attachments')
export class RfqAttachmentOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  rfqId: number;

  @ManyToOne(() => RfqOrmEntity, (rfq) => rfq.attachments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'rfqId' })
  rfq: RfqOrmEntity;

  @Column({ type: 'varchar', length: 512 })
  url: string;

  @Column({ type: 'varchar', length: 255 })
  originalName: string;

  @Column({ type: 'varchar', length: 128 })
  mimeType: string;

  @Column({ type: 'int', default: 0 })
  size: number;
}
