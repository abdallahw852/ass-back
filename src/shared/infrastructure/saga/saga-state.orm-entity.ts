import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * TypeORM entity for storing SAGA state
 */
@Entity('saga_states')
@Index(['sagaId'], { unique: true })
@Index(['status'])
export class SagaStateEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('uuid', { name: 'saga_id', unique: true })
  sagaId: string;

  @Column('varchar', { length: 50 })
  status: string;

  @Column('int', { name: 'current_step', default: 0 })
  currentStep: number;

  @Column('jsonb')
  data: Record<string, unknown>;

  @Column('int', { name: 'completed_steps', array: true, default: [] })
  completedSteps: number[];

  @Column('text', { nullable: true })
  error: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
