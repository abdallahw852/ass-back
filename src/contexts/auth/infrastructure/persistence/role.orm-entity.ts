import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('roles')
export class RoleOrmEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;
}
