import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('rfq_attachments')
export class RfqAttachmentReadModel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  rfqId: number;

  @Column({ type: 'varchar', length: 512 })
  url: string;

  @Column({ type: 'varchar', length: 255 })
  originalName: string;

  @Column({ type: 'varchar', length: 128 })
  mimeType: string;

  @Column({ type: 'int', default: 0 })
  size: number;
}
