import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { QuotationOrmEntity } from './quotation.orm-entity';

@Entity('quotation_customizations')
export class QuotationCustomizationOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  quotationId: number;

  @ManyToOne(
    () => QuotationOrmEntity,
    (quotation) => quotation.customizations,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'quotationId' })
  quotation: QuotationOrmEntity;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  value: string;
}
