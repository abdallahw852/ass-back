import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RfqOrmEntity } from './rfq.orm-entity';

@Entity('rfq_customizations')
export class RfqCustomizationOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  rfqId: number;

  @ManyToOne(() => RfqOrmEntity, (rfq) => rfq.customizations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'rfqId' })
  rfq: RfqOrmEntity;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  value: string;
}
