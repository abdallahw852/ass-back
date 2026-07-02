import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('role_permissions')
@Index(['role', 'module', 'action'], { unique: true })
export class RolePermissionOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64 })
  role: string;

  @Column({ type: 'varchar', length: 64 })
  module: string;

  @Column({ type: 'varchar', length: 64 })
  action: string;

  @Column({ type: 'boolean', default: true })
  allowed: boolean;
}
