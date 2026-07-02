import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('rfq_customizations')
export class RfqCustomizationReadModel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  rfqId: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  value: string;
}
