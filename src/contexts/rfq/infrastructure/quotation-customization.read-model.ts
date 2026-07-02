import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('quotation_customizations')
export class QuotationCustomizationReadModel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  quotationId: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  value: string;
}
